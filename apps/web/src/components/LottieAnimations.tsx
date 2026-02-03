import Lottie from 'lottie-react';

// Corporate green color: #10b981 -> RGB: [0.063, 0.725, 0.506]
// Corporate gold color: #d4af37 -> RGB: [0.831, 0.686, 0.216]
// Purple accent: #8b5cf6 -> RGB: [0.545, 0.361, 0.965]

// Data Cycle Flywheel Animation - particles orbiting in continuous cycle
// Static pre-computed keyframes for 15-second rotation (450 frames at 30fps)
const dataCycleAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 450, // 15 seconds at 30fps
  w: 320,
  h: 320,
  nm: "Data Cycle Flywheel",
  ddd: 0,
  assets: [],
  layers: [
    // Layer 1: Center Hub - Pulsing glow
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Center Glow",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 0, s: [40], h: 0 },
          { t: 225, s: [70], h: 0 },
          { t: 450, s: [40], h: 0 }
        ]},
        p: { a: 0, k: [160, 160, 0] },
        s: { a: 1, k: [
          { t: 0, s: [100, 100, 100], h: 0 },
          { t: 225, s: [140, 140, 100], h: 0 },
          { t: 450, s: [100, 100, 100], h: 0 }
        ]}
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [60, 60] }
      }, {
        ty: "fl",
        c: { a: 0, k: [0.063, 0.725, 0.506, 1] },
        o: { a: 0, k: 100 }
      }]
    },
    // Layer 2: Center Hub Core
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "Center Core",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [160, 160, 0] },
        s: { a: 1, k: [
          { t: 0, s: [100, 100, 100], h: 0 },
          { t: 225, s: [115, 115, 100], h: 0 },
          { t: 450, s: [100, 100, 100], h: 0 }
        ]}
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [36, 36] }
      }, {
        ty: "fl",
        c: { a: 0, k: [0.063, 0.725, 0.506, 1] },
        o: { a: 0, k: 100 }
      }]
    },
    // Layer 3: Outer orbit ring (faint)
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: "Outer Ring",
      sr: 1,
      ks: {
        o: { a: 0, k: 15 },
        p: { a: 0, k: [160, 160, 0] },
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [240, 240] }
      }, {
        ty: "st",
        c: { a: 0, k: [0.063, 0.725, 0.506, 1] },
        o: { a: 0, k: 100 },
        w: { a: 0, k: 1 }
      }]
    },
    // Layer 4: Middle orbit ring (faint)
    {
      ddd: 0,
      ind: 4,
      ty: 4,
      nm: "Middle Ring",
      sr: 1,
      ks: {
        o: { a: 0, k: 12 },
        p: { a: 0, k: [160, 160, 0] },
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [170, 170] }
      }, {
        ty: "st",
        c: { a: 0, k: [0.831, 0.686, 0.216, 1] },
        o: { a: 0, k: 100 },
        w: { a: 0, k: 1 }
      }]
    },
    // Layer 5: Inner orbit ring (faint)
    {
      ddd: 0,
      ind: 5,
      ty: 4,
      nm: "Inner Ring",
      sr: 1,
      ks: {
        o: { a: 0, k: 10 },
        p: { a: 0, k: [160, 160, 0] },
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] }
      }, {
        ty: "st",
        c: { a: 0, k: [0.545, 0.361, 0.965, 1] },
        o: { a: 0, k: 100 },
        w: { a: 0, k: 1 }
      }]
    },
    // Layer 6-11: Orbiting particles (6 particles with static keyframes)
    // Particle 1 - Large green, outer orbit (radius 110, starts at top)
    {
      ddd: 0,
      ind: 6,
      ty: 4,
      nm: "Particle 1",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 0, s: [90], h: 0 },
          { t: 225, s: [100], h: 0 },
          { t: 450, s: [90], h: 0 }
        ]},
        p: { a: 1, k: [
          { t: 0, s: [160, 50, 0], h: 0 },
          { t: 112, s: [270, 160, 0], h: 0 },
          { t: 225, s: [160, 270, 0], h: 0 },
          { t: 337, s: [50, 160, 0], h: 0 },
          { t: 450, s: [160, 50, 0], h: 0 }
        ]},
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [14, 14] }
      }, {
        ty: "fl",
        c: { a: 0, k: [0.063, 0.725, 0.506, 1] },
        o: { a: 0, k: 100 }
      }]
    },
    // Particle 2 - Medium gold, outer orbit (radius 110, starts at right, offset by 90deg)
    {
      ddd: 0,
      ind: 7,
      ty: 4,
      nm: "Particle 2",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 0, s: [85], h: 0 },
          { t: 225, s: [100], h: 0 },
          { t: 450, s: [85], h: 0 }
        ]},
        p: { a: 1, k: [
          { t: 0, s: [270, 160, 0], h: 0 },
          { t: 112, s: [160, 270, 0], h: 0 },
          { t: 225, s: [50, 160, 0], h: 0 },
          { t: 337, s: [160, 50, 0], h: 0 },
          { t: 450, s: [270, 160, 0], h: 0 }
        ]},
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [12, 12] }
      }, {
        ty: "fl",
        c: { a: 0, k: [0.831, 0.686, 0.216, 1] },
        o: { a: 0, k: 100 }
      }]
    },
    // Particle 3 - Small green, middle orbit (radius 85, faster - 2x speed)
    {
      ddd: 0,
      ind: 8,
      ty: 4,
      nm: "Particle 3",
      sr: 1,
      ks: {
        o: { a: 0, k: 95 },
        p: { a: 1, k: [
          { t: 0, s: [245, 160, 0], h: 0 },
          { t: 56, s: [160, 245, 0], h: 0 },
          { t: 112, s: [75, 160, 0], h: 0 },
          { t: 168, s: [160, 75, 0], h: 0 },
          { t: 225, s: [245, 160, 0], h: 0 },
          { t: 281, s: [160, 245, 0], h: 0 },
          { t: 337, s: [75, 160, 0], h: 0 },
          { t: 393, s: [160, 75, 0], h: 0 },
          { t: 450, s: [245, 160, 0], h: 0 }
        ]},
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [10, 10] }
      }, {
        ty: "fl",
        c: { a: 0, k: [0.063, 0.725, 0.506, 1] },
        o: { a: 0, k: 100 }
      }]
    },
    // Particle 4 - Medium purple, middle orbit (radius 85, offset)
    {
      ddd: 0,
      ind: 9,
      ty: 4,
      nm: "Particle 4",
      sr: 1,
      ks: {
        o: { a: 0, k: 90 },
        p: { a: 1, k: [
          { t: 0, s: [75, 160, 0], h: 0 },
          { t: 56, s: [160, 75, 0], h: 0 },
          { t: 112, s: [245, 160, 0], h: 0 },
          { t: 168, s: [160, 245, 0], h: 0 },
          { t: 225, s: [75, 160, 0], h: 0 },
          { t: 281, s: [160, 75, 0], h: 0 },
          { t: 337, s: [245, 160, 0], h: 0 },
          { t: 393, s: [160, 245, 0], h: 0 },
          { t: 450, s: [75, 160, 0], h: 0 }
        ]},
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [11, 11] }
      }, {
        ty: "fl",
        c: { a: 0, k: [0.545, 0.361, 0.965, 1] },
        o: { a: 0, k: 100 }
      }]
    },
    // Particle 5 - Small gold, inner orbit (radius 50, fastest - 3x speed)
    {
      ddd: 0,
      ind: 10,
      ty: 4,
      nm: "Particle 5",
      sr: 1,
      ks: {
        o: { a: 0, k: 85 },
        p: { a: 1, k: [
          { t: 0, s: [195, 160, 0], h: 0 },
          { t: 37, s: [160, 195, 0], h: 0 },
          { t: 75, s: [125, 160, 0], h: 0 },
          { t: 112, s: [160, 125, 0], h: 0 },
          { t: 150, s: [195, 160, 0], h: 0 },
          { t: 187, s: [160, 195, 0], h: 0 },
          { t: 225, s: [125, 160, 0], h: 0 },
          { t: 262, s: [160, 125, 0], h: 0 },
          { t: 300, s: [195, 160, 0], h: 0 },
          { t: 337, s: [160, 195, 0], h: 0 },
          { t: 375, s: [125, 160, 0], h: 0 },
          { t: 412, s: [160, 125, 0], h: 0 },
          { t: 450, s: [195, 160, 0], h: 0 }
        ]},
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [8, 8] }
      }, {
        ty: "fl",
        c: { a: 0, k: [0.831, 0.686, 0.216, 1] },
        o: { a: 0, k: 100 }
      }]
    },
    // Particle 6 - Tiny green, inner orbit (radius 50, offset)
    {
      ddd: 0,
      ind: 11,
      ty: 4,
      nm: "Particle 6",
      sr: 1,
      ks: {
        o: { a: 0, k: 80 },
        p: { a: 1, k: [
          { t: 0, s: [125, 160, 0], h: 0 },
          { t: 37, s: [160, 125, 0], h: 0 },
          { t: 75, s: [195, 160, 0], h: 0 },
          { t: 112, s: [160, 195, 0], h: 0 },
          { t: 150, s: [125, 160, 0], h: 0 },
          { t: 187, s: [160, 125, 0], h: 0 },
          { t: 225, s: [195, 160, 0], h: 0 },
          { t: 262, s: [160, 195, 0], h: 0 },
          { t: 300, s: [125, 160, 0], h: 0 },
          { t: 337, s: [160, 125, 0], h: 0 },
          { t: 375, s: [195, 160, 0], h: 0 },
          { t: 412, s: [160, 195, 0], h: 0 },
          { t: 450, s: [125, 160, 0], h: 0 }
        ]},
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [6, 6] }
      }, {
        ty: "fl",
        c: { a: 0, k: [0.063, 0.725, 0.506, 1] },
        o: { a: 0, k: 100 }
      }]
    },
    // Layer 12-15: Node pulse indicators at 4 cardinal positions
    // Node 1 - Top (12 o'clock)
    {
      ddd: 0,
      ind: 12,
      ty: 4,
      nm: "Node Top",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 0, s: [50], h: 0 },
          { t: 112, s: [90], h: 0 },
          { t: 225, s: [50], h: 0 },
          { t: 337, s: [90], h: 0 },
          { t: 450, s: [50], h: 0 }
        ]},
        p: { a: 0, k: [160, 40, 0] },
        s: { a: 1, k: [
          { t: 0, s: [100, 100, 100], h: 0 },
          { t: 112, s: [150, 150, 100], h: 0 },
          { t: 225, s: [100, 100, 100], h: 0 },
          { t: 337, s: [150, 150, 100], h: 0 },
          { t: 450, s: [100, 100, 100], h: 0 }
        ]}
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [18, 18] }
      }, {
        ty: "fl",
        c: { a: 0, k: [0.063, 0.725, 0.506, 1] },
        o: { a: 0, k: 100 }
      }]
    },
    // Node 2 - Right (3 o'clock)
    {
      ddd: 0,
      ind: 13,
      ty: 4,
      nm: "Node Right",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 0, s: [50], h: 0 },
          { t: 168, s: [90], h: 0 },
          { t: 281, s: [50], h: 0 },
          { t: 393, s: [90], h: 0 },
          { t: 450, s: [50], h: 0 }
        ]},
        p: { a: 0, k: [280, 160, 0] },
        s: { a: 1, k: [
          { t: 0, s: [100, 100, 100], h: 0 },
          { t: 168, s: [150, 150, 100], h: 0 },
          { t: 281, s: [100, 100, 100], h: 0 },
          { t: 393, s: [150, 150, 100], h: 0 },
          { t: 450, s: [100, 100, 100], h: 0 }
        ]}
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [18, 18] }
      }, {
        ty: "fl",
        c: { a: 0, k: [0.831, 0.686, 0.216, 1] },
        o: { a: 0, k: 100 }
      }]
    },
    // Node 3 - Bottom (6 o'clock)
    {
      ddd: 0,
      ind: 14,
      ty: 4,
      nm: "Node Bottom",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 0, s: [50], h: 0 },
          { t: 225, s: [90], h: 0 },
          { t: 337, s: [50], h: 0 },
          { t: 450, s: [90], h: 0 }
        ]},
        p: { a: 0, k: [160, 280, 0] },
        s: { a: 1, k: [
          { t: 0, s: [100, 100, 100], h: 0 },
          { t: 225, s: [150, 150, 100], h: 0 },
          { t: 337, s: [100, 100, 100], h: 0 },
          { t: 450, s: [150, 150, 100], h: 0 }
        ]}
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [18, 18] }
      }, {
        ty: "fl",
        c: { a: 0, k: [0.545, 0.361, 0.965, 1] },
        o: { a: 0, k: 100 }
      }]
    },
    // Node 4 - Left (9 o'clock)
    {
      ddd: 0,
      ind: 15,
      ty: 4,
      nm: "Node Left",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 0, s: [90], h: 0 },
          { t: 112, s: [50], h: 0 },
          { t: 281, s: [90], h: 0 },
          { t: 393, s: [50], h: 0 },
          { t: 450, s: [90], h: 0 }
        ]},
        p: { a: 0, k: [40, 160, 0] },
        s: { a: 1, k: [
          { t: 0, s: [150, 150, 100], h: 0 },
          { t: 112, s: [100, 100, 100], h: 0 },
          { t: 281, s: [150, 150, 100], h: 0 },
          { t: 393, s: [100, 100, 100], h: 0 },
          { t: 450, s: [150, 150, 100], h: 0 }
        ]}
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [18, 18] }
      }, {
        ty: "fl",
        c: { a: 0, k: [0.063, 0.725, 0.506, 1] },
        o: { a: 0, k: 100 }
      }]
    },
    // Layer 16-19: Connection arcs between nodes (curved dashed lines)
    // Arc Top to Right
    {
      ddd: 0,
      ind: 16,
      ty: 4,
      nm: "Arc TR",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 0, s: [30], h: 0 },
          { t: 150, s: [60], h: 0 },
          { t: 300, s: [30], h: 0 },
          { t: 450, s: [60], h: 0 }
        ]},
        p: { a: 0, k: [160, 160, 0] },
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "sh",
              ks: {
                a: 0,
                k: {
                  c: false,
                  v: [[0, -120], [85, -85], [120, 0]],
                  i: [[0, 0], [-20, -50], [0, 0]],
                  o: [[0, 0], [50, -20], [0, 0]]
                }
              }
            },
            {
              ty: "st",
              c: { a: 0, k: [0.831, 0.686, 0.216, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 2 },
              lc: 2,
              d: [{ n: "d", v: { a: 0, k: 6 } }, { n: "g", v: { a: 0, k: 6 } }]
            },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] }
            }
          ]
        }
      ]
    },
    // Arc Right to Bottom
    {
      ddd: 0,
      ind: 17,
      ty: 4,
      nm: "Arc RB",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 0, s: [60], h: 0 },
          { t: 150, s: [30], h: 0 },
          { t: 300, s: [60], h: 0 },
          { t: 450, s: [30], h: 0 }
        ]},
        p: { a: 0, k: [160, 160, 0] },
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "sh",
              ks: {
                a: 0,
                k: {
                  c: false,
                  v: [[120, 0], [85, 85], [0, 120]],
                  i: [[0, 0], [50, 20], [0, 0]],
                  o: [[0, 0], [20, 50], [0, 0]]
                }
              }
            },
            {
              ty: "st",
              c: { a: 0, k: [0.831, 0.686, 0.216, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 2 },
              lc: 2,
              d: [{ n: "d", v: { a: 0, k: 6 } }, { n: "g", v: { a: 0, k: 6 } }]
            },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] }
            }
          ]
        }
      ]
    },
    // Arc Bottom to Left
    {
      ddd: 0,
      ind: 18,
      ty: 4,
      nm: "Arc BL",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 0, s: [30], h: 0 },
          { t: 150, s: [60], h: 0 },
          { t: 300, s: [30], h: 0 },
          { t: 450, s: [60], h: 0 }
        ]},
        p: { a: 0, k: [160, 160, 0] },
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "sh",
              ks: {
                a: 0,
                k: {
                  c: false,
                  v: [[0, 120], [-85, 85], [-120, 0]],
                  i: [[0, 0], [20, 50], [0, 0]],
                  o: [[0, 0], [-50, 20], [0, 0]]
                }
              }
            },
            {
              ty: "st",
              c: { a: 0, k: [0.831, 0.686, 0.216, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 2 },
              lc: 2,
              d: [{ n: "d", v: { a: 0, k: 6 } }, { n: "g", v: { a: 0, k: 6 } }]
            },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] }
            }
          ]
        }
      ]
    },
    // Arc Left to Top
    {
      ddd: 0,
      ind: 19,
      ty: 4,
      nm: "Arc LT",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 0, s: [60], h: 0 },
          { t: 150, s: [30], h: 0 },
          { t: 300, s: [60], h: 0 },
          { t: 450, s: [30], h: 0 }
        ]},
        p: { a: 0, k: [160, 160, 0] },
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "sh",
              ks: {
                a: 0,
                k: {
                  c: false,
                  v: [[-120, 0], [-85, -85], [0, -120]],
                  i: [[0, 0], [-50, -20], [0, 0]],
                  o: [[0, 0], [-20, -50], [0, 0]]
                }
              }
            },
            {
              ty: "st",
              c: { a: 0, k: [0.831, 0.686, 0.216, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 2 },
              lc: 2,
              d: [{ n: "d", v: { a: 0, k: 6 } }, { n: "g", v: { a: 0, k: 6 } }]
            },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] }
            }
          ]
        }
      ]
    }
  ]
};

// Data Flow Animation - represents data moving through pipeline
const dataFlowAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 90,
  w: 200,
  h: 200,
  nm: "Data Flow",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Circle 1",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 0, s: [0], h: 0 },
          { t: 15, s: [100], h: 0 },
          { t: 75, s: [100], h: 0 },
          { t: 90, s: [0], h: 0 }
        ]},
        p: { a: 1, k: [
          { t: 0, s: [30, 100, 0], h: 0 },
          { t: 90, s: [170, 100, 0], h: 0 }
        ]},
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [16, 16] }
      }, {
        ty: "fl",
        c: { a: 0, k: [0.063, 0.725, 0.506, 1] }, // #10b981
        o: { a: 0, k: 100 }
      }]
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "Circle 2",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 15, s: [0], h: 0 },
          { t: 30, s: [100], h: 0 },
          { t: 75, s: [100], h: 0 },
          { t: 90, s: [0], h: 0 }
        ]},
        p: { a: 1, k: [
          { t: 15, s: [30, 100, 0], h: 0 },
          { t: 90, s: [150, 100, 0], h: 0 }
        ]},
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [12, 12] }
      }, {
        ty: "fl",
        c: { a: 0, k: [0.831, 0.686, 0.216, 1] }, // #d4af37
        o: { a: 0, k: 100 }
      }]
    },
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: "Circle 3",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 30, s: [0], h: 0 },
          { t: 45, s: [100], h: 0 },
          { t: 75, s: [100], h: 0 },
          { t: 90, s: [0], h: 0 }
        ]},
        p: { a: 1, k: [
          { t: 30, s: [30, 100, 0], h: 0 },
          { t: 90, s: [130, 100, 0], h: 0 }
        ]},
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [{
        ty: "el",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [10, 10] }
      }, {
        ty: "fl",
        c: { a: 0, k: [0.063, 0.725, 0.506, 1] }, // #10b981
        o: { a: 0, k: 100 }
      }]
    }
  ]
};

// Checkmark Success Animation
const checkmarkAnimation = {
  v: "5.7.4",
  fr: 60,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  nm: "Checkmark",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Check",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [50, 50, 0] },
        s: { a: 1, k: [
          { t: 0, s: [0, 0, 100], h: 0 },
          { t: 20, s: [110, 110, 100], h: 0 },
          { t: 30, s: [100, 100, 100], h: 0 }
        ]}
      },
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "sh",
              ks: {
                a: 0,
                k: {
                  c: false,
                  v: [[-15, 0], [-5, 10], [15, -10]],
                  i: [[0, 0], [0, 0], [0, 0]],
                  o: [[0, 0], [0, 0], [0, 0]]
                }
              }
            },
            {
              ty: "st",
              c: { a: 0, k: [0.063, 0.725, 0.506, 1] }, // #10b981
              o: { a: 0, k: 100 },
              w: { a: 0, k: 4 },
              lc: 2,
              lj: 2
            },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] }
            }
          ]
        }
      ]
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "Circle",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [50, 50, 0] },
        s: { a: 1, k: [
          { t: 0, s: [0, 0, 100], h: 0 },
          { t: 15, s: [105, 105, 100], h: 0 },
          { t: 25, s: [100, 100, 100], h: 0 }
        ]}
      },
      shapes: [
        {
          ty: "el",
          p: { a: 0, k: [0, 0] },
          s: { a: 0, k: [60, 60] }
        },
        {
          ty: "st",
          c: { a: 0, k: [0.063, 0.725, 0.506, 1] }, // #10b981
          o: { a: 0, k: 100 },
          w: { a: 0, k: 3 }
        }
      ]
    }
  ]
};

// Pulse Animation for step indicators
const pulseAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  nm: "Pulse",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Outer Ring",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 0, s: [80], h: 0 },
          { t: 30, s: [0], h: 0 },
          { t: 60, s: [80], h: 0 }
        ]},
        p: { a: 0, k: [50, 50, 0] },
        s: { a: 1, k: [
          { t: 0, s: [100, 100, 100], h: 0 },
          { t: 30, s: [150, 150, 100], h: 0 },
          { t: 60, s: [100, 100, 100], h: 0 }
        ]}
      },
      shapes: [
        {
          ty: "el",
          p: { a: 0, k: [0, 0] },
          s: { a: 0, k: [40, 40] }
        },
        {
          ty: "st",
          c: { a: 0, k: [0.063, 0.725, 0.506, 1] }, // #10b981
          o: { a: 0, k: 100 },
          w: { a: 0, k: 2 }
        }
      ]
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "Inner Circle",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [50, 50, 0] },
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [
        {
          ty: "el",
          p: { a: 0, k: [0, 0] },
          s: { a: 0, k: [30, 30] }
        },
        {
          ty: "fl",
          c: { a: 0, k: [0.063, 0.725, 0.506, 1] }, // #10b981
          o: { a: 0, k: 100 }
        }
      ]
    }
  ]
};

// Chart/Analytics Animation
const analyticsAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 90,
  w: 200,
  h: 150,
  nm: "Analytics",
  ddd: 0,
  assets: [],
  layers: [
    // Bar 1
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Bar 1",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [40, 120, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [
          { t: 0, s: [100, 0, 100], h: 0 },
          { t: 20, s: [100, 100, 100], h: 0 }
        ]}
      },
      shapes: [
        {
          ty: "rc",
          p: { a: 0, k: [0, -30] },
          s: { a: 0, k: [24, 60] },
          r: { a: 0, k: 4 }
        },
        {
          ty: "fl",
          c: { a: 0, k: [0.063, 0.725, 0.506, 1] }, // #10b981
          o: { a: 0, k: 100 }
        }
      ]
    },
    // Bar 2
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "Bar 2",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [80, 120, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [
          { t: 10, s: [100, 0, 100], h: 0 },
          { t: 30, s: [100, 100, 100], h: 0 }
        ]}
      },
      shapes: [
        {
          ty: "rc",
          p: { a: 0, k: [0, -45] },
          s: { a: 0, k: [24, 90] },
          r: { a: 0, k: 4 }
        },
        {
          ty: "fl",
          c: { a: 0, k: [0.831, 0.686, 0.216, 1] }, // #d4af37
          o: { a: 0, k: 100 }
        }
      ]
    },
    // Bar 3
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: "Bar 3",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [120, 120, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [
          { t: 20, s: [100, 0, 100], h: 0 },
          { t: 40, s: [100, 100, 100], h: 0 }
        ]}
      },
      shapes: [
        {
          ty: "rc",
          p: { a: 0, k: [0, -35] },
          s: { a: 0, k: [24, 70] },
          r: { a: 0, k: 4 }
        },
        {
          ty: "fl",
          c: { a: 0, k: [0.063, 0.725, 0.506, 1] }, // #10b981
          o: { a: 0, k: 100 }
        }
      ]
    },
    // Bar 4
    {
      ddd: 0,
      ind: 4,
      ty: 4,
      nm: "Bar 4",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [160, 120, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [
          { t: 30, s: [100, 0, 100], h: 0 },
          { t: 50, s: [100, 100, 100], h: 0 }
        ]}
      },
      shapes: [
        {
          ty: "rc",
          p: { a: 0, k: [0, -55] },
          s: { a: 0, k: [24, 110] },
          r: { a: 0, k: 4 }
        },
        {
          ty: "fl",
          c: { a: 0, k: [0.831, 0.686, 0.216, 1] }, // #d4af37
          o: { a: 0, k: 100 }
        }
      ]
    }
  ]
};

// Loading/Processing Animation
const processingAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  nm: "Processing",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Spinner",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [50, 50, 0] },
        r: { a: 1, k: [
          { t: 0, s: [0], h: 0 },
          { t: 60, s: [360], h: 0 }
        ]},
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "el",
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [50, 50] }
            },
            {
              ty: "st",
              c: { a: 0, k: [0.063, 0.725, 0.506, 1] }, // #10b981
              o: { a: 0, k: 100 },
              w: { a: 0, k: 4 },
              lc: 2,
              d: [{ n: "d", v: { a: 0, k: 78 } }, { n: "g", v: { a: 0, k: 78 } }]
            },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] }
            }
          ]
        }
      ]
    }
  ]
};

// Component exports
interface LottieAnimationProps {
  className?: string;
  style?: React.CSSProperties;
  loop?: boolean;
}

export function DataFlowAnimation({ className, style, loop = true }: LottieAnimationProps) {
  return (
    <Lottie 
      animationData={dataFlowAnimation} 
      loop={loop}
      className={className}
      style={style}
    />
  );
}

export function CheckmarkAnimation({ className, style, loop = false }: LottieAnimationProps) {
  return (
    <Lottie 
      animationData={checkmarkAnimation} 
      loop={loop}
      className={className}
      style={style}
    />
  );
}

export function PulseAnimation({ className, style, loop = true }: LottieAnimationProps) {
  return (
    <Lottie 
      animationData={pulseAnimation} 
      loop={loop}
      className={className}
      style={style}
    />
  );
}

export function AnalyticsAnimation({ className, style, loop = true }: LottieAnimationProps) {
  return (
    <Lottie 
      animationData={analyticsAnimation} 
      loop={loop}
      className={className}
      style={style}
    />
  );
}

export function ProcessingAnimation({ className, style, loop = true }: LottieAnimationProps) {
  return (
    <Lottie 
      animationData={processingAnimation} 
      loop={loop}
      className={className}
      style={style}
    />
  );
}

export function DataCycleAnimation({ className, style, loop = true }: LottieAnimationProps) {
  return (
    <Lottie 
      animationData={dataCycleAnimation} 
      loop={loop}
      className={className}
      style={style}
    />
  );
}

export default {
  DataFlowAnimation,
  CheckmarkAnimation,
  PulseAnimation,
  AnalyticsAnimation,
  ProcessingAnimation,
  DataCycleAnimation,
};
