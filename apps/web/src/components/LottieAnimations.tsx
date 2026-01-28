import Lottie from 'lottie-react';

// Corporate green color: #10b981
// Corporate gold color: #d4af37

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

export default {
  DataFlowAnimation,
  CheckmarkAnimation,
  PulseAnimation,
  AnalyticsAnimation,
  ProcessingAnimation,
};
