<template>
  <div class="discovery-signal" aria-hidden="true">
    <svg viewBox="0 0 280 140" fill="none">
      <defs>
        <linearGradient id="discovery-sweep-fill" x1="142" y1="12" x2="205" y2="72" gradientUnits="userSpaceOnUse"><stop stop-color="#285ad7" stop-opacity=".2"/><stop offset="1" stop-color="#285ad7" stop-opacity="0"/></linearGradient>
      </defs>
      <path class="signal-link" d="M51 41c30 0 36 29 91 29m0 0c42 0 40-37 90-37m-90 37c43 0 42 44 92 44" stroke="#c8d7ef" stroke-dasharray="3 5" />
      <circle cx="142" cy="70" r="58" stroke="#dbe5f4"/><circle cx="142" cy="70" r="39" stroke="#dbe5f4"/><circle cx="142" cy="70" r="20" stroke="#dbe5f4"/>
      <g class="signal-sweep"><path d="M142 70V12a58 58 0 0 1 58 58Z" fill="url(#discovery-sweep-fill)"/><path d="M142 70V12" stroke="#6990e5" stroke-width="1.5"/></g>
      <circle class="signal-point signal-point--one" cx="179" cy="42" r="4" fill="#285ad7"/>
      <circle class="signal-point signal-point--two" cx="109" cy="91" r="4" fill="#36a298"/>
      <circle class="signal-point signal-point--three" cx="162" cy="111" r="3" fill="#7195d6"/>
      <circle class="signal-core" cx="142" cy="70" r="11" fill="#285ad7" fill-opacity=".1"/><circle cx="142" cy="70" r="5" fill="#285ad7"/>
      <g class="signal-tile signal-tile--one"><rect x="24" y="24" width="38" height="38" rx="11" fill="white" stroke="#dce5f1"/><path d="m38 36-5 7 5 7m10-14 5 7-5 7" stroke="#285ad7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g>
      <g class="signal-tile signal-tile--two"><rect x="222" y="14" width="32" height="32" rx="10" fill="white" stroke="#dce5f1"/><path d="M234 24v12m8-12v12m-11-8h14m-14 4h14" stroke="#36a298" stroke-width="1.5" stroke-linecap="round"/></g>
      <g class="signal-tile signal-tile--three"><rect x="221" y="99" width="30" height="30" rx="9" fill="white" stroke="#dce5f1"/><path d="m229 110 4 4-4 4m8 0h5" stroke="#7195d6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>
    </svg>
  </div>
</template>
