// PA System application-type templates.
// Each entry maps an application name to a wired/ip list of
// [componentType, qty] tuples. qty may be a number, "auto" (sized by the
// calc engine from load/zone requirements), or "manual" (professional
// amplifier requiring manual selection, no auto-pick).
export const paApplicationTemplates = {
  "Office & Corporate Building": {
    wired: [
      ["wall-speaker", 2],
      ["mixer-amplifier", "auto"],
      ["paging-microphone", 1],
      ["accessories", 1],
      ["installation-service", 1]
    ],
    ip: [
      ["network-paging-console", 1],
      ["ip-system-controller", 1],
      ["ip-ceiling-speaker", 10],
      ["ip-cabinet-speaker", 2],
      ["poe-switch", "auto"],
      ["network-cable", 1],
      ["ups", 1],
      ["accessories", 1],
      ["installation-service", 1]
    ]
  },
  "School, College & University": {
    wired: [
      ["paging-microphone", 1],
      ["mixer-amplifier", "auto"],
      ["ceiling-speaker", 12],
      ["wall-speaker", 4],
      ["horn-speaker", 2],
      ["accessories", 1],
      ["installation-service", 1]
    ],
    ip: [
      ["network-paging-console", 1],
      ["ip-system-controller", 1],
      ["ip-ceiling-speaker", 12],
      ["ip-cabinet-speaker", 4],
      ["ip-horn-speaker", 2],
      ["poe-switch", "auto"],
      ["network-cable", 1],
      ["ups", 1],
      ["accessories", 1],
      ["installation-service", 1]
    ]
  },
  "Hospital & Diagnostic Centre": {
    wired: [
      ["paging-microphone", 1],
      ["multi-zone-mixer-amplifier", "auto"],
      ["ceiling-speaker", 20],
      ["wall-speaker", 4],
      ["accessories", 1],
      ["installation-service", 1]
    ],
    ip: [
      ["network-paging-console", 1],
      ["ip-system-controller", 1],
      ["ip-ceiling-speaker", 20],
      ["ip-cabinet-speaker", 4],
      ["fire-alarm-interface", 1],
      ["poe-switch", "auto"],
      ["network-cable", 1],
      ["ups", 1],
      ["accessories", 1],
      ["installation-service", 1]
    ]
  },
  "Factory & Industrial Area": {
    wired: [
      ["paging-microphone", 1],
      ["mixer-amplifier", "auto"],
      ["horn-speaker", 8],
      ["column-speaker", 4],
      ["wall-speaker", 2],
      ["accessories", 1],
      ["installation-service", 1]
    ],
    ip: [
      ["network-paging-console", 1],
      ["ip-system-controller", 1],
      ["ip-horn-speaker", 8],
      ["ip-column-speaker", 4],
      ["ip-cabinet-speaker", 2],
      ["fire-alarm-interface", 1],
      ["poe-switch", "auto"],
      ["network-cable", 1],
      ["ups", 1],
      ["accessories", 1],
      ["installation-service", 1]
    ]
  },
  "Shopping Mall & Retail Store": {
    wired: [
      ["paging-microphone", 1],
      ["multi-zone-mixer-amplifier", "auto"],
      ["ceiling-speaker", 24],
      ["wall-speaker", 4],
      ["pendant-speaker", 4],
      ["accessories", 1],
      ["installation-service", 1]
    ],
    ip: [
      ["network-paging-console", 1],
      ["ip-system-controller", 1],
      ["ip-ceiling-speaker", 24],
      ["ip-cabinet-speaker", 4],
      ["poe-switch", "auto"],
      ["network-cable", 1],
      ["ups", 1],
      ["accessories", 1],
      ["installation-service", 1]
    ]
  },
  "Mosque & Religious Institution": {
    wired: [
      ["mixer-amplifier", "auto"],
      ["column-speaker", 4],
      ["horn-speaker", 2],
      ["paging-microphone", 2],
      ["accessories", 1],
      ["installation-service", 1]
    ],
    ip: [
      ["network-paging-console", 1],
      ["ip-column-speaker", 4],
      ["ip-horn-speaker", 2],
      ["poe-switch", "auto"],
      ["network-cable", 1],
      ["accessories", 1],
      ["installation-service", 1]
    ]
  },
  "Auditorium & Multipurpose Hall": {
    wired: [
      ["audio-mixer", 1],
      ["full-range-speaker", 2],
      ["subwoofer", 1],
      ["professional-power-amplifier", "manual"],
      ["paging-microphone", 2],
      ["stage-monitor", 1],
      ["power-sequencer", 1],
      ["accessories", 1],
      ["installation-service", 1]
    ],
    ip: [
      ["network-paging-console", 1],
      ["ip-system-controller", 1],
      ["ip-cabinet-speaker", 4],
      ["ip-amplifier", "auto"],
      ["poe-switch", "auto"],
      ["network-cable", 1],
      ["ups", 1],
      ["accessories", 1],
      ["installation-service", 1]
    ]
  },
  Airport: {
    wired: [
      ["zone-paging-microphone", 1],
      ["multi-zone-mixer-amplifier", "auto"],
      ["ceiling-speaker", 12],
      ["column-speaker", 8],
      ["horn-speaker", 8],
      ["ups", 1],
      ["accessories", 1],
      ["installation-service", 1]
    ],
    ip: [
      ["network-paging-console", 1],
      ["management-server", 1],
      ["management-software", 1],
      ["ip-column-speaker", 8],
      ["ip-horn-speaker", 8],
      ["fire-alarm-interface", 1],
      ["poe-switch", "auto"],
      ["network-cable", 2],
      ["ups", 1],
      ["accessories", 1],
      ["installation-service", 1]
    ]
  }
};

// Maps the remaining application names (not directly defined above) onto
// the closest template. "Custom Application" is intentionally absent —
// it starts empty with only Add Component/Add Custom Item available.
export const paApplicationTemplateAliases = {
  "Government Office": "Office & Corporate Building",
  "Bank & Customer Service Centre": "Office & Corporate Building",
  "Residential Building & Apartment": "Office & Corporate Building",
  "Warehouse & Logistics Centre": "Factory & Industrial Area",
  "Hotel, Restaurant & Resort": "Shopping Mall & Retail Store",
  "Community Centre": "Auditorium & Multipurpose Hall",
  "Railway Station": "Airport",
  "Bus Terminal": "Airport",
  "Stadium & Sports Ground": "Factory & Industrial Area",
  "Outdoor Event & Public Area": "Factory & Industrial Area",
  "Multi-Building Campus": "Hospital & Diagnostic Centre"
};

export const paApplicationTypes = [
  "Office & Corporate Building",
  "School, College & University",
  "Hospital & Diagnostic Centre",
  "Factory & Industrial Area",
  "Warehouse & Logistics Centre",
  "Shopping Mall & Retail Store",
  "Hotel, Restaurant & Resort",
  "Mosque & Religious Institution",
  "Government Office",
  "Bank & Customer Service Centre",
  "Residential Building & Apartment",
  "Auditorium & Multipurpose Hall",
  "Community Centre",
  "Airport",
  "Railway Station",
  "Bus Terminal",
  "Stadium & Sports Ground",
  "Outdoor Event & Public Area",
  "Multi-Building Campus",
  "Custom Application"
];

// Resolves an application name to its template key ("Custom Application"
// and unrecognized names resolve to null, meaning "start empty").
export function resolveTemplateKey(applicationType) {
  if (paApplicationTemplates[applicationType]) return applicationType;
  if (paApplicationTemplateAliases[applicationType]) {
    return paApplicationTemplateAliases[applicationType];
  }
  return null;
}
