import workerUrl from '@browsermt/bergamot-translator/worker/translator-worker.js?url&no-inline'
import runtimeUrl from '@browsermt/bergamot-translator/worker/bergamot-translator-worker.js?url&no-inline'
import wasmUrl from '@browsermt/bergamot-translator/worker/bergamot-translator-worker.wasm?url&no-inline'

const modelStorage = 'https://storage.googleapis.com/download/storage/v1/b/moz-fx-translations-data--303e-prod-translations-data/o/'
const targetPair = { from: 'en', to: 'ja' }

type ModelFile = { path: string }
type Model = {
  releaseStatus: string | null
  files: {
    model: ModelFile
    lexicalShortlist: ModelFile
    vocab?: ModelFile
    srcVocab?: ModelFile
    trgVocab?: ModelFile
  }
}
type Registry = { models: Record<string, Model[]> }
type Pair = { from: string; to: string }
type Translation = { target: { text: string } }
type WorkerReply = { id: number; result: unknown; error?: { message: string } }

async function fetchModelAsset(path: string) {
  const url = `${modelStorage}${encodeURIComponent(path)}?alt=media`
  const response = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new Error(`Translation data could not be loaded (${response.status})`)
  return response
}

async function download(file: ModelFile) {
  const response = await fetchModelAsset(file.path)
  if (!response.body) throw new Error('Empty translation model download')
  const bytes = response.body.pipeThrough(new DecompressionStream('gzip'))
  return new Response(bytes).arrayBuffer()
}

function releasedModel(registry: Registry, { from, to }: Pair) {
  return registry.models[`${from}-${to}`]?.find(({ releaseStatus }) =>
    releaseStatus === 'Release' || releaseStatus === 'Release Desktop',
  )
}

async function createEngine() {
  // These imported assets must remain siblings so the classic worker can resolve them.
  const directory = new URL('.', new URL(workerUrl, location.href)).pathname
  if (new URL(runtimeUrl, location.href).pathname !== `${directory}bergamot-translator-worker.js`
    || new URL(wasmUrl, location.href).pathname !== `${directory}bergamot-translator-worker.wasm`) {
    throw new Error('Translation worker assets are missing')
  }

  const worker = new Worker(workerUrl)
  let nextId = 0

  function call<T>(name: string, args: unknown[], transfer: ArrayBuffer[] = []) {
    return new Promise<T>((resolve, reject) => {
      const id = ++nextId
      const timeout = setTimeout(() => fail(new Error('Translation worker timed out')), 20_000)

      function cleanup() {
        clearTimeout(timeout)
        worker.removeEventListener('message', reply)
        worker.removeEventListener('error', fail)
      }

      function fail(error: unknown) {
        cleanup()
        worker.terminate()
        engine = undefined
        reject(error)
      }

      function reply(event: MessageEvent<WorkerReply>) {
        if (event.data.id !== id) return
        if (event.data.error) {
          fail(new Error(event.data.error.message))
          return
        }
        cleanup()
        resolve(event.data.result as T)
      }

      worker.addEventListener('message', reply)
      worker.addEventListener('error', fail)
      try {
        worker.postMessage({ id, name, args }, transfer)
      } catch (error) {
        fail(error)
      }
    })
  }

  const [registry] = await Promise.all([
    fetchModelAsset('db/models.json').then((response) => response.json() as Promise<Registry>),
    call<void>('initialize', [{}]),
  ]).catch((error: unknown) => {
    worker.terminate()
    throw error
  })

  async function load(pair: Pair, { files }: Model) {
    const vocabFiles = files.vocab ? [files.vocab] : [files.srcVocab, files.trgVocab]
    if (!vocabFiles.every((file) => file !== undefined)) throw new Error('Missing translation vocabulary')
    const [model, shortlist, vocabs] = await Promise.all([
      download(files.model),
      download(files.lexicalShortlist),
      Promise.all(vocabFiles.map(download)),
    ])
    await call<void>('loadTranslationModel', [pair, { model, shortlist, vocabs }], [model, shortlist, ...vocabs])
  }

  let lastSource: Pair | undefined
  let englishModelLoaded = false
  return async (text: string, from: string) => {
    const direct = { from, to: 'ja' }
    const source = releasedModel(registry, direct) ? direct : { from, to: 'en' }
    const sourceModel = releasedModel(registry, source)
    const englishModel = releasedModel(registry, targetPair)
    if (!sourceModel || !englishModel) throw new Error(`No translation model for ${from}`)

    if (from !== 'en' && from !== lastSource?.from) {
      if (lastSource) await call<void>('freeTranslationModel', [lastSource])
      lastSource = undefined
      await load(source, sourceModel)
      lastSource = source
    }
    if (source.to === 'en' || from === 'en') {
      if (!englishModelLoaded) await load(targetPair, englishModel)
      englishModelLoaded = true
    }

    const models = source.to === 'ja' ? [source] : [source, targetPair]
    const [result] = await call<Translation[]>('translate', [{ models, texts: [{ text, html: false }] }])
    const translated = result?.target.text.trim()
    if (!translated) throw new Error('Empty translation')
    return translated
  }
}

let engine: ReturnType<typeof createEngine> | undefined
let queue = Promise.resolve()

export function translate(text: string, from: string, signal?: AbortSignal) {
  const result = queue.then(async () => {
    signal?.throwIfAborted()
    engine ??= createEngine().catch((error: unknown) => {
      engine = undefined
      throw error
    })
    const run = await engine
    signal?.throwIfAborted()
    return run(text, from)
  })

  queue = result.then(() => {}, () => {})
  return result
}
