import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════
//  DATA & CONSTANTS
// ═══════════════════════════════════════════════════════

const STAGES = [
  { name: "Egg",       icon: "🥚", color: "#d4b8f0" },
  { name: "Hatchling", icon: "🐣", color: "#c8a8e9" },
  { name: "Sprout",    icon: "🌱", color: "#a8d8c8" },
  { name: "Bloom",     icon: "🌸", color: "#f0a8c8" },
  { name: "Luminary",  icon: "✨", color: "#f5c842" },
  { name: "Ancient",   icon: "🌌", color: "#80b0ff" },
];
const STAGE_XP = [0, 60, 180, 400, 750, 1300];

const WEATHERS = [
  { name: "Sunny",   icon: "☀️",  moodMod:  5, bg: "rgba(255,200,50,0.05)"  },
  { name: "Cloudy",  icon: "☁️",  moodMod: -2, bg: "rgba(150,150,180,0.05)" },
  { name: "Rainy",   icon: "🌧️",  moodMod: -4, bg: "rgba(80,120,200,0.07)"  },
  { name: "Stormy",  icon: "⛈️",  moodMod: -8, bg: "rgba(60,60,120,0.1)"    },
  { name: "Snowy",   icon: "❄️",  moodMod:  0, bg: "rgba(200,230,255,0.05)" },
  { name: "Starry",  icon: "🌠",  moodMod: 10, bg: "rgba(100,80,200,0.06)"  },
];

const PERSONALITIES = {
  curious:  { emoji: "🔍", label: "Curious",  desc: "Always exploring new things"   },
  playful:  { emoji: "🎉", label: "Playful",  desc: "Loves games & fun above all"   },
  shy:      { emoji: "🙈", label: "Shy",      desc: "Quiet, gentle & introspective"  },
  brave:    { emoji: "⚔️",  label: "Brave",   desc: "Fearless cosmic adventurer"     },
  lazy:     { emoji: "😴", label: "Lazy",     desc: "Needs extra rest & naps"        },
};

const SHOP = {
  food: [
    { id:"moonberry",   name:"Moon Berry",      emoji:"🫐", price:8,  hunger:20, happy:3                  },
    { id:"starsoup",    name:"Star Soup",        emoji:"🍜", price:18, hunger:40, happy:8                  },
    { id:"dreamcake",   name:"Dream Cake",       emoji:"🎂", price:35, hunger:60, happy:15                 },
    { id:"elixir",      name:"Vitality Elixir",  emoji:"⚗️",  price:55, hunger:30, health:25               },
    { id:"cosmicapple", name:"Cosmic Apple",     emoji:"🍎", price:12, hunger:25, happy:5                  },
  ],
  toys: [
    { id:"orb",    name:"Crystal Orb",     emoji:"🔮", price:20, happy:20, nrg:-8,  xp:8  },
    { id:"book",   name:"Dream Journal",   emoji:"📖", price:30, happy:12, nrg:-3,  xp:18 },
    { id:"plush",  name:"Cosmic Plush",    emoji:"🧸", price:25, happy:18, nrg:-5,  xp:10 },
    { id:"flute",  name:"Crystal Flute",   emoji:"🎵", price:40, happy:25, nrg:-3,  xp:12 },
  ],
  medicine: [
    { id:"potion",   name:"Healing Potion",  emoji:"🧪", price:40, health:50, cures:true },
    { id:"vitamins", name:"Moon Vitamins",   emoji:"💊", price:30, health:25, nrg:15     },
    { id:"bandage",  name:"Star Bandage",    emoji:"🩹", price:20, health:15             },
  ],
  accessories: [
    { id:"wizard",  name:"Wizard Hat",    emoji:"🎩", price:120 },
    { id:"crown",   name:"Star Crown",    emoji:"👑", price:200 },
    { id:"bow",     name:"Cosmic Bow",    emoji:"🎀", price:80  },
    { id:"specs",   name:"Moon Specs",    emoji:"🥽", price:150 },
    { id:"scarf",   name:"Nebula Scarf",  emoji:"🧣", price:100 },
  ],
  decor: [
    { id:"fern",    name:"Glowing Fern",     emoji:"🌿", price:60  },
    { id:"lantern", name:"Star Lantern",     emoji:"🏮", price:80  },
    { id:"crystal", name:"Prism Crystal",   emoji:"💎", price:100 },
    { id:"window",  name:"Galaxy Window",   emoji:"🌌", price:180 },
    { id:"rug",     name:"Moonbeam Rug",    emoji:"🌙", price:120 },
  ],
};

const ACHIEVEMENTS = [
  { id:"first_feed",  emoji:"🍽️", name:"First Meal",      desc:"Feed your pet",              reward:15, check: s => s.totalFeeds >= 1       },
  { id:"chef",        emoji:"👨‍🍳", name:"Top Chef",        desc:"Feed 15 times",              reward:25, check: s => s.totalFeeds >= 15      },
  { id:"bath",        emoji:"🛁", name:"Squeaky Clean",   desc:"Bathe your pet",             reward:15, check: s => s.totalBaths >= 1       },
  { id:"healer",      emoji:"💊", name:"On the Mend",     desc:"Cure an illness",            reward:30, check: s => s.totalCures >= 1       },
  { id:"gamer",       emoji:"🎮", name:"Game On!",        desc:"Play a mini-game",           reward:20, check: s => s.totalGames >= 1       },
  { id:"arcade",      emoji:"🕹️", name:"Arcade Ace",      desc:"Play 10 games",              reward:50, check: s => s.totalGames >= 10      },
  { id:"lv5",         emoji:"⭐", name:"Rising Star",     desc:"Reach Level 5",              reward:40, check: s => s.level >= 5            },
  { id:"lv10",        emoji:"🌟", name:"Shooting Star",   desc:"Reach Level 10",             reward:80, check: s => s.level >= 10           },
  { id:"rich",        emoji:"💰", name:"Coin Baron",      desc:"Collect 500 coins",          reward:0,  check: s => s.coins >= 500          },
  { id:"evolved",     emoji:"🦋", name:"All Grown Up",   desc:"Reach Luminary stage",       reward:60, check: s => s.stageIdx >= 4         },
  { id:"ancient",     emoji:"🌌", name:"Ancient Being",  desc:"Reach Ancient stage",        reward:100,check: s => s.stageIdx >= 5         },
  { id:"bff",         emoji:"🤝", name:"Best Friends",   desc:"100 friendship pts",         reward:50, check: s => s.friendship >= 100     },
  { id:"fashionista", emoji:"👒", name:"Fashion Icon",   desc:"Buy an accessory",           reward:25, check: s => s.accessories.length>=1  },
  { id:"decorator",   emoji:"🏡", name:"Home Stylist",   desc:"Buy 3 decorations",          reward:40, check: s => s.decor.length >= 3     },
  { id:"streak7",     emoji:"🔥", name:"Week Warrior",   desc:"7-day care streak",          reward:70, check: s => s.careStreak >= 7       },
];

const INIT = {
  petName:"Lumi", stageIdx:0, xp:0, level:1,
  stats:{ hunger:80, happy:80, health:100, nrg:90, clean:100 },
  coins:50,
  inv:{ food:[], toys:[], medicine:[] },
  accessories:[], equippedAcc:null,
  decor:[], weather:0, timeOfDay:"day",
  achievements:[], friendship:0,
  personality:"curious", careStreak:0, lastCareDate:null,
  journal:[{ ts:Date.now(), text:"✨ A mysterious egg drifted in from the cosmos..." }],
  totalFeeds:0, totalBaths:0, totalCures:0, totalGames:0, totalInteractions:0,
  isAsleep:false, isSick:false, tick:0, petMood:"happy",
  loginClaimed:false,
};

// ═══════════════════════════════════════════════════════
//  PET DISPLAY
// ═══════════════════════════════════════════════════════

function PetDisplay({ stageIdx, mood, acc, isAsleep, isSick, animState }) {
  const stage = STAGES[stageIdx] || STAGES[0];
  const c = stage.color;
  const sz = [60,72,86,100,114,110][stageIdx] || 80;

  const faces = {
    happy:    { eyes:"◡  ◡", mouth:"‿" },
    ecstatic: { eyes:"⌒  ⌒", mouth:"▽" },
    sad:      { eyes:"╥  ╥", mouth:"﹏" },
    hungry:   { eyes:"·  ·", mouth:"○" },
    bored:    { eyes:"—  —", mouth:"—" },
    sick:     { eyes:"×  ×", mouth:"~" },
    sleeping: { eyes:"—  —", mouth:"‿" },
    dirty:    { eyes:"^  ^", mouth:"~" },
    playing:  { eyes:"★  ★", mouth:"▽" },
    eating:   { eyes:"^  ^", mouth:"▼" },
    bathing:  { eyes:"•  •", mouth:"○" },
  };
  const f = faces[isAsleep?"sleeping": isSick?"sick": animState==="eating"?"eating": animState==="playing"?"playing": animState==="bathing"?"bathing": mood] || faces.happy;
  const showBlush = ["happy","ecstatic","playing","eating"].includes(mood) && !isSick && !isAsleep;
  const anim = animState==="playing"?"petJump 0.45s ease infinite alternate":
               animState==="eating" ?"petWiggle 0.3s ease infinite":
               animState==="bathing"?"petSpin 1.2s linear infinite":
               animState==="happy" ?"petBounce 0.4s ease 3":
               isAsleep            ?"none":"petBob 2.2s ease-in-out infinite";

  return (
    <div style={{ position:"relative", display:"inline-block", userSelect:"none" }}>
      {acc && (
        <div style={{ textAlign:"center", fontSize:28, marginBottom:-6, position:"relative", zIndex:3 }}>
          {acc.emoji}
        </div>
      )}
      {/* Ears for stage 2+ */}
      {stageIdx >= 2 && (
        <>
          <div style={{ position:"absolute", top:-8, left:sz*0.18, width:sz*0.2, height:sz*0.25,
            background:`radial-gradient(circle, ${c}cc, ${c}88)`,
            borderRadius:"60% 60% 0 0", boxShadow:`0 0 8px ${c}66`, zIndex:1 }} />
          <div style={{ position:"absolute", top:-8, right:sz*0.18, width:sz*0.2, height:sz*0.25,
            background:`radial-gradient(circle, ${c}cc, ${c}88)`,
            borderRadius:"60% 60% 0 0", boxShadow:`0 0 8px ${c}66`, zIndex:1 }} />
        </>
      )}
      {/* Tail for stage 4+ */}
      {stageIdx >= 4 && (
        <div style={{ position:"absolute", bottom:sz*0.1, right:-sz*0.25,
          width:sz*0.3, height:sz*0.18,
          background:`radial-gradient(ellipse, ${c}88, transparent)`,
          borderRadius:"0 50% 50% 0", transform:"rotate(20deg)" }} />
      )}
      {/* Body */}
      <div style={{
        width:sz, height:sz,
        background:`radial-gradient(circle at 35% 32%, ${c}ee, ${c}66)`,
        borderRadius:"52% 48% 46% 54% / 55% 48% 52% 45%",
        border:`2.5px solid ${c}99`,
        boxShadow:`0 0 25px ${c}44, 0 0 50px ${c}22, inset 0 0 20px rgba(255,255,255,0.12)`,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        position:"relative", zIndex:2,
        animation: anim,
        filter: isSick ? "hue-rotate(100deg) saturate(0.4) brightness(0.8)" : "none",
        transition:"filter 0.6s ease, width 0.8s ease, height 0.8s ease",
        cursor:"pointer",
      }}>
        {/* Shine */}
        <div style={{ position:"absolute", top:sz*0.08, left:sz*0.2,
          width:sz*0.22, height:sz*0.12,
          background:"rgba(255,255,255,0.25)",
          borderRadius:"50%", transform:"rotate(-30deg)", pointerEvents:"none" }} />
        {/* Eyes */}
        <div style={{ fontSize:sz*0.17, letterSpacing:sz*0.07,
          color:"#1a0a2a", fontWeight:"bold", lineHeight:1.1,
          textShadow:"0 1px 0 rgba(255,255,255,0.3)", marginTop:-sz*0.04 }}>
          {f.eyes}
        </div>
        {/* Mouth */}
        <div style={{ fontSize:sz*0.13, color:"#1a0a2a", marginTop:sz*0.03 }}>
          {f.mouth}
        </div>
        {/* Blush */}
        {showBlush && (
          <>
            <div style={{ position:"absolute", width:sz*0.22, height:sz*0.11,
              background:"#ff9eb5", borderRadius:"50%",
              left:sz*0.07, top:"57%", opacity:0.55, filter:"blur(2px)" }} />
            <div style={{ position:"absolute", width:sz*0.22, height:sz*0.11,
              background:"#ff9eb5", borderRadius:"50%",
              right:sz*0.07, top:"57%", opacity:0.55, filter:"blur(2px)" }} />
          </>
        )}
        {/* Bubbles when bathing */}
        {animState==="bathing" && [0,1,2].map(i => (
          <div key={i} style={{ position:"absolute",
            width:8+i*3, height:8+i*3,
            border:"1.5px solid rgba(150,220,255,0.6)",
            borderRadius:"50%",
            top: `${20+i*20}%`, left:`${15+i*30}%`,
            animation:"floatBubble 1s ease-in-out infinite",
            animationDelay:`${i*0.3}s` }} />
        ))}
        {/* Sick icon */}
        {isSick && <div style={{ position:"absolute", top:-12, right:-6, fontSize:16 }}>🤢</div>}
        {isAsleep && <div style={{ position:"absolute", top:-14, right:-10, fontSize:14, color:"#aaa", animation:"floatUp 2s ease infinite" }}>💤</div>}
        {mood==="ecstatic" && <div style={{ position:"absolute", top:-10, left:-10, fontSize:14, animation:"starSpin 1s linear infinite" }}>✨</div>}
      </div>
      {/* Ground shadow */}
      <div style={{ width:sz*0.65, height:7,
        background:"rgba(0,0,0,0.18)", borderRadius:"50%",
        margin:"5px auto 0", filter:"blur(3px)" }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  STAT BAR
// ═══════════════════════════════════════════════════════

function StatBar({ label, value, icon, color }) {
  const pct = Math.max(0, Math.min(100, value));
  const warn = pct < 25;
  const barColor = warn ? "#ff4757" : pct < 50 ? "#ffa502" : color;
  return (
    <div style={{ marginBottom:9 }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        fontSize:11.5, color:"#bbb", marginBottom:3 }}>
        <span>{icon} {label}</span>
        <span style={{ color: warn ? "#ff6b6b" : "#ccc", fontWeight: warn ? 700 : 400 }}>
          {warn && "⚠️ "}{Math.round(pct)}%
        </span>
      </div>
      <div style={{ height:7, background:"rgba(255,255,255,0.07)",
        borderRadius:4, overflow:"hidden", position:"relative" }}>
        <div style={{ height:"100%", width:`${pct}%`,
          background: warn
            ? "linear-gradient(90deg, #ff4757, #ff6b81)"
            : `linear-gradient(90deg, ${barColor}99, ${barColor})`,
          borderRadius:4,
          transition:"width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow:`0 0 8px ${barColor}55` }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  MINI-GAME: STAR CATCHER
// ═══════════════════════════════════════════════════════

function StarCatcher({ onClose, onEarn }) {
  const [stars, setStars] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const scoreRef = useRef(0);

  useEffect(() => {
    if (phase !== "playing") return;
    const spawnT = setInterval(() => {
      setStars(s => [...s, {
        id: Date.now()+Math.random(),
        x: 5 + Math.random()*88,
        y: -5,
        speed: 0.8 + Math.random()*1.8,
        type: Math.random()<0.2 ? "gold" : Math.random()<0.1 ? "rainbow" : "silver",
      }]);
    }, 550);
    const fallT = setInterval(() => {
      setStars(s => s.map(st=>({...st, y:st.y+st.speed})).filter(st=>st.y<102));
    }, 40);
    const countT = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { setPhase("done"); return 0; }
        return t-1;
      });
    }, 1000);
    return () => { clearInterval(spawnT); clearInterval(fallT); clearInterval(countT); };
  }, [phase]);

  const catchStar = (id, type) => {
    setStars(s => s.filter(st=>st.id!==id));
    const pts = type==="gold"?3: type==="rainbow"?5:1;
    setScore(s => { scoreRef.current = s+pts; return s+pts; });
  };

  const start = () => { setPhase("playing"); setScore(0); scoreRef.current=0; setTimeLeft(25); setStars([]); };
  const collect = () => { onEarn(scoreRef.current*3); onClose(); };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontSize:14, color:"#f5c842" }}>⭐ {score} Stars</span>
        <span style={{ fontSize:13, color:"#ccc" }}>⏱ {timeLeft}s</span>
        <button onClick={onClose} style={miniBtn}>✕ Exit</button>
      </div>
      <div style={{ flex:1, background:"rgba(0,0,15,0.85)", borderRadius:14,
        position:"relative", overflow:"hidden",
        border:"1px solid rgba(255,255,255,0.08)", cursor:"crosshair" }}>
        {/* Static bg stars */}
        {Array.from({length:18}).map((_,i) => (
          <div key={i} style={{ position:"absolute",
            left:`${(i*41)%97}%`, top:`${(i*53)%95}%`,
            fontSize:8, opacity:0.2, pointerEvents:"none",
            animation:`twinkle ${1.5+(i%3)*0.4}s ease-in-out infinite`,
            animationDelay:`${(i*0.2)%2}s` }}>✦</div>
        ))}
        {/* Falling stars */}
        {stars.map(st => (
          <div key={st.id} onClick={()=>catchStar(st.id,st.type)}
            style={{ position:"absolute", left:`${st.x}%`, top:`${st.y}%`,
              fontSize: st.type==="gold"?26: st.type==="rainbow"?28:18,
              filter: st.type==="gold"?"drop-shadow(0 0 8px gold)":
                      st.type==="rainbow"?"drop-shadow(0 0 10px magenta)":
                      "drop-shadow(0 0 4px silver)",
              cursor:"pointer", transition:"top 0.04s linear",
              userSelect:"none", zIndex:2, lineHeight:1 }}>
            {st.type==="gold"?"⭐": st.type==="rainbow"?"🌟":"✦"}
          </div>
        ))}
        {phase==="intro" && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:12 }}>
            <div style={{ fontSize:40 }}>🌟</div>
            <div style={{ color:"#e8d5ff", fontSize:15, fontWeight:700 }}>Star Catcher</div>
            <div style={{ color:"#9b8fc7", fontSize:12, textAlign:"center", lineHeight:1.6 }}>
              ✦ Silver = 3 coins<br/>⭐ Gold = 9 coins<br/>🌟 Rainbow = 15 coins
            </div>
            <button onClick={start} style={bigBtn}>✨ Start!</button>
          </div>
        )}
        {phase==="done" && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:10 }}>
            <div style={{ fontSize:36 }}>🎉</div>
            <div style={{ color:"#f5c842", fontSize:22, fontWeight:700 }}>{score} Stars!</div>
            <div style={{ color:"#aaa", fontSize:13 }}>Reward: {score*3} coins 💰</div>
            <div style={{ display:"flex", gap:8, marginTop:4 }}>
              <button onClick={start} style={miniBtn}>Again!</button>
              <button onClick={collect} style={bigBtn}>Collect 💰</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  MINI-GAME: MEMORY MATCH
// ═══════════════════════════════════════════════════════

function MemoryMatch({ onClose, onEarn }) {
  const EMOJIS = ["🌙","⭐","🔮","🌈","🦋","🌺","🍄","🐉"];
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [locked, setLocked] = useState(false);

  const init = useCallback(() => {
    const deck = [...EMOJIS,...EMOJIS]
      .sort(()=>Math.random()-0.5)
      .map((e,i)=>({ id:i, emoji:e }));
    setCards(deck); setFlipped([]); setMatched(new Set()); setMoves(0); setWon(false); setLocked(false);
  }, []);
  useEffect(()=>{ init(); },[]);

  useEffect(() => {
    if (flipped.length !== 2) return;
    setLocked(true);
    const [a,b] = flipped;
    if (cards[a]?.emoji === cards[b]?.emoji) {
      setMatched(m => { const nm=new Set(m); nm.add(a); nm.add(b); return nm; });
      setFlipped([]); setLocked(false);
      setMoves(m=>m+1);
      if (matched.size+2 >= cards.length) setWon(true);
    } else {
      setTimeout(()=>{ setFlipped([]); setLocked(false); setMoves(m=>m+1); }, 900);
    }
  }, [flipped]);

  useEffect(()=>{ if(matched.size===cards.length && cards.length>0) setWon(true); },[matched]);

  const flip = (i) => {
    if (locked || flipped.includes(i) || matched.has(i) || flipped.length>=2) return;
    setFlipped(f=>[...f,i]);
  };

  const reward = Math.max(10, Math.round(220 - moves*10));

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontSize:13, color:"#c8a8e9" }}>🧩 Moves: {moves}</span>
        <span style={{ fontSize:13, color:"#4ade80" }}>✅ {matched.size/2}/{EMOJIS.length}</span>
        <button onClick={onClose} style={miniBtn}>✕ Exit</button>
      </div>
      {won ? (
        <div style={{ flex:1, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:12 }}>
          <div style={{ fontSize:44 }}>🎊</div>
          <div style={{ color:"#f5c842", fontSize:22, fontWeight:700 }}>You Won!</div>
          <div style={{ color:"#aaa", fontSize:13 }}>{moves} moves · Reward: {reward} coins</div>
          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            <button onClick={init} style={miniBtn}>Again!</button>
            <button onClick={()=>{ onEarn(reward); onClose(); }} style={bigBtn}>Collect 💰</button>
          </div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
          gap:7, flex:1, alignContent:"start" }}>
          {cards.map((c,i) => {
            const isFlipped = flipped.includes(i) || matched.has(i);
            const isMatched = matched.has(i);
            return (
              <div key={c.id} onClick={()=>flip(i)} style={{
                background: isMatched ? "rgba(74,222,128,0.18)" :
                            isFlipped ? "rgba(130,100,220,0.35)" : "rgba(255,255,255,0.05)",
                border:`2px solid ${isMatched?"rgba(74,222,128,0.6)": isFlipped?"rgba(200,168,233,0.5)":"rgba(255,255,255,0.08)"}`,
                borderRadius:10, aspectRatio:"1",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:isFlipped?26:22,
                cursor:"pointer", transition:"all 0.25s ease",
                transform: isFlipped?"scale(1)":"scale(0.93)",
                boxShadow: isMatched?"0 0 12px rgba(74,222,128,0.35)":"none",
              }}>
                {isFlipped ? c.emoji : "✦"}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  SHARED STYLES
// ═══════════════════════════════════════════════════════

const panel = {
  background:"rgba(16,10,38,0.65)",
  backdropFilter:"blur(14px)",
  border:"1px solid rgba(255,255,255,0.07)",
  borderRadius:18,
  padding:16,
};
const bigBtn = {
  background:"linear-gradient(135deg,rgba(200,168,233,0.35),rgba(155,143,199,0.25))",
  border:"1px solid rgba(200,168,233,0.5)",
  borderRadius:12, color:"#e8d5ff",
  padding:"9px 20px", cursor:"pointer",
  fontSize:13, fontFamily:"inherit", fontWeight:600,
  transition:"all 0.2s ease",
};
const miniBtn = {
  background:"rgba(255,255,255,0.07)",
  border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:9, color:"#ccc",
  padding:"5px 12px", cursor:"pointer",
  fontSize:12, fontFamily:"inherit",
  transition:"all 0.2s ease",
};
const inputStyle = {
  background:"rgba(255,255,255,0.05)",
  border:"1px solid rgba(200,168,233,0.35)",
  borderRadius:9, color:"#e8d5ff",
  padding:"5px 10px", fontSize:13,
  fontFamily:"inherit", outline:"none", width:110,
};

// ═══════════════════════════════════════════════════════
//  MAIN GAME COMPONENT
// ═══════════════════════════════════════════════════════

export default function VPetGame() {
  const [gs, setGs] = useState(() => {
    try { const s=localStorage.getItem("lumipet_v3"); if(s) return {...INIT,...JSON.parse(s)}; }
    catch{}
    return INIT;
  });

  const [tab,      setTab]      = useState("home");
  const [shopCat,  setShopCat]  = useState("food");
  const [game,     setGame]     = useState(null);   // null | "stars" | "memory"
  const [anim,     setAnim]     = useState("idle");
  const [notif,    setNotif]    = useState(null);
  const [particles,setParticles]= useState([]);
  const [naming,   setNaming]   = useState(false);
  const [newName,  setNewName]  = useState("");
  const [logExpand,setLogExpand]= useState(false);
  const toastRef = useRef(null);
  const animRef  = useRef(null);

  // ── Save ─────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem("lumipet_v3", JSON.stringify(gs)); } catch{}
  }, [gs]);

  // ── Game tick every 9s ──────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setGs(prev => {
        const s = {...prev.stats};
        const sleeping = prev.isAsleep;
        const wmod = WEATHERS[prev.weather]?.moodMod || 0;

        if (!sleeping) {
          s.hunger = Math.max(0, s.hunger - 1.8);
          s.happy  = Math.max(0, s.happy  - (1.2 - wmod*0.05));
          s.clean  = Math.max(0, s.clean  - 0.9);
          s.nrg    = Math.max(0, s.nrg    - 0.6);
        } else {
          s.nrg    = Math.min(100, s.nrg + 6);
          s.hunger = Math.max(0, s.hunger - 0.5);
        }

        if (s.hunger<20||s.clean<15) s.health = Math.max(0, s.health-1.8);
        else if (s.hunger>60&&s.happy>60&&!prev.isSick) s.health=Math.min(100,s.health+0.4);

        let isSick = prev.isSick;
        const newLog = [...prev.journal];
        if (!isSick&&s.health<25&&Math.random()<0.09) {
          isSick=true;
          newLog.push({ts:Date.now(), text:`😟 ${prev.petName} fell ill...`});
        }
        if (isSick) s.health=Math.max(0,s.health-1.5);

        const xpGain = sleeping?1.2: prev.isSick?0.6:2.5;
        const newXp  = prev.xp + xpGain;
        let lvl      = prev.level;
        while (newXp >= lvl*70) lvl++;

        let stIdx = prev.stageIdx;
        while (stIdx<STAGE_XP.length-1 && newXp>=STAGE_XP[stIdx+1]) {
          stIdx++;
          newLog.push({ts:Date.now(), text:`🎉 ${prev.petName} evolved into ${STAGES[stIdx].icon} ${STAGES[stIdx].name}!`});
        }

        let wx = prev.weather;
        if (Math.random()<0.012) wx=Math.floor(Math.random()*WEATHERS.length);

        const h = new Date().getHours();
        const tod = h<6?"night":h<9?"dawn":h<18?"day":h<21?"dusk":"night";

        const avg=(s.hunger+s.happy+s.health)/3;
        let mood="happy";
        if (isSick)          mood="sick";
        else if (sleeping)   mood="sleeping";
        else if (avg<30)     mood="sad";
        else if (s.hunger<20)mood="hungry";
        else if (s.happy<20) mood="bored";
        else if (s.clean<15) mood="dirty";
        else if (avg>85)     mood="ecstatic";

        let coins=prev.coins;
        if (avg>75&&Math.random()<0.12) coins=Math.min(999999,coins+1);

        return {
          ...prev, stats:s, xp:newXp, level:lvl, stageIdx:stIdx,
          weather:wx, timeOfDay:tod, petMood:mood,
          coins, isSick, journal:newLog.slice(-60), tick:prev.tick+1,
        };
      });
    }, 9000);
    return () => clearInterval(id);
  }, []);

  // ── Achievement watcher ─────────────────────────────
  useEffect(() => {
    ACHIEVEMENTS.forEach(ach => {
      if (!gs.achievements.includes(ach.id) && ach.check(gs)) {
        setGs(p => ({
          ...p,
          achievements:[...p.achievements, ach.id],
          coins: p.coins+ach.reward,
          journal:[...p.journal,{ts:Date.now(),text:`🏆 Achievement unlocked: ${ach.name}!`}],
        }));
        toast(`🏆 ${ach.name}!${ach.reward?" +"+ach.reward+" coins":""}`);
      }
    });
  }, [
    gs.level, gs.totalFeeds, gs.totalBaths, gs.totalCures, gs.totalGames,
    gs.stageIdx, gs.coins, gs.careStreak, gs.decor?.length,
    gs.accessories?.length, gs.friendship,
  ]);

  // ── Helpers ──────────────────────────────────────────
  const toast = (msg) => {
    clearTimeout(toastRef.current);
    setNotif(msg);
    toastRef.current = setTimeout(()=>setNotif(null), 3200);
  };

  const doAnim = (a, dur=1600) => {
    clearTimeout(animRef.current);
    setAnim(a);
    animRef.current = setTimeout(()=>setAnim("idle"), dur);
  };

  const spawnParticles = (emojis=[]) => {
    const ps = Array.from({length:5},(_,i)=>({
      id:Date.now()+i, emoji:emojis[i%emojis.length],
      x:35+Math.random()*30, y:40+Math.random()*15,
    }));
    setParticles(p=>[...p,...ps]);
    setTimeout(()=>setParticles(p=>p.filter(x=>!ps.find(n=>n.id===x.id))), 1600);
  };

  // ── Actions ──────────────────────────────────────────
  const feedItem = (item) => {
    if (gs.isAsleep) return toast("💤 Your pet is sleeping...");
    const cnt = gs.inv.food.filter(f=>f.id===item.id).length;
    if (!cnt) return toast("None in inventory!");
    doAnim("eating"); spawnParticles(["😋","✨","💫"]);
    setGs(p=>{
      const food=[...p.inv.food]; food.splice(food.findIndex(f=>f.id===item.id),1);
      return { ...p,
        stats:{ ...p.stats,
          hunger:Math.min(100,p.stats.hunger+(item.hunger||0)),
          happy:Math.min(100,p.stats.happy+(item.happy||0)),
          health:Math.min(100,p.stats.health+(item.health||0)) },
        inv:{...p.inv, food},
        totalFeeds:p.totalFeeds+1, friendship:p.friendship+2,
        xp:p.xp+5, totalInteractions:p.totalInteractions+1,
      };
    });
    toast(`😋 ${gs.petName} loved it!`);
  };

  const useToy = (item) => {
    if (gs.isAsleep) return toast("💤 Sleeping...");
    if (gs.stats.nrg<10) return toast("😴 Too tired to play!");
    doAnim("playing",1800); spawnParticles(["💖","⭐","🎉"]);
    setGs(p=>({ ...p,
      stats:{...p.stats,
        happy:Math.min(100,p.stats.happy+(item.happy||0)),
        nrg:Math.max(0,p.stats.nrg+(item.nrg||0)) },
      xp:p.xp+(item.xp||10),
      friendship:p.friendship+3, totalInteractions:p.totalInteractions+1,
    }));
    toast(`🎉 So much fun!`);
  };

  const useMedicine = (item) => {
    const cnt = gs.inv.medicine.filter(m=>m.id===item.id).length;
    if (!cnt) return toast("None in inventory!");
    doAnim("happy"); spawnParticles(["💊","✨","💚"]);
    setGs(p=>{
      const medicine=[...p.inv.medicine];
      medicine.splice(medicine.findIndex(m=>m.id===item.id),1);
      return { ...p,
        stats:{...p.stats,
          health:Math.min(100,p.stats.health+(item.health||0)),
          nrg:Math.min(100,p.stats.nrg+(item.nrg||0)) },
        inv:{...p.inv,medicine},
        isSick: item.cures?false:p.isSick,
        totalCures: item.cures&&p.isSick ? p.totalCures+1:p.totalCures,
        xp:p.xp+8, totalInteractions:p.totalInteractions+1,
      };
    });
    toast("💊 Feeling better!");
  };

  const bathePet = () => {
    if (gs.isAsleep) return toast("💤 Sleeping...");
    doAnim("bathing",2200); spawnParticles(["💦","🫧","✨"]);
    setGs(p=>({ ...p,
      stats:{...p.stats, clean:100, happy:Math.min(100,p.stats.happy+5)},
      totalBaths:p.totalBaths+1, friendship:p.friendship+2,
      xp:p.xp+5, totalInteractions:p.totalInteractions+1,
    }));
    toast("🛁 Sparkling clean!");
  };

  const toggleSleep = () => {
    if (!gs.isAsleep) doAnim("idle");
    setGs(p=>({...p, isAsleep:!p.isAsleep}));
    toast(gs.isAsleep?"🌅 Good morning!":"💤 Sweet dreams~");
  };

  const petThePet = () => {
    spawnParticles(["💖","🌟","✨"]);
    doAnim("happy",900);
    setGs(p=>({ ...p,
      stats:{...p.stats, happy:Math.min(100,p.stats.happy+4)},
      friendship:p.friendship+1, totalInteractions:p.totalInteractions+1,
    }));
  };

  const buyItem = (cat, item) => {
    if (gs.coins < item.price) return toast("💸 Not enough coins!");
    if (cat==="accessories"&&gs.accessories.find(a=>a.id===item.id)) return toast("Already owned!");
    if (cat==="decor"&&gs.decor.find(d=>d.id===item.id)) return toast("Already owned!");
    if (cat==="accessories")
      setGs(p=>({...p, coins:p.coins-item.price, accessories:[...p.accessories,item]}));
    else if (cat==="decor")
      setGs(p=>({...p, coins:p.coins-item.price, decor:[...p.decor,item]}));
    else
      setGs(p=>({...p, coins:p.coins-item.price,
        inv:{...p.inv,[cat]:[...p.inv[cat],item]}}));
    toast(`🛍️ Bought ${item.name}!`);
  };

  const equipAcc = (acc) => {
    setGs(p=>({...p, equippedAcc:p.equippedAcc?.id===acc.id?null:acc}));
    toast(gs.equippedAcc?.id===acc.id ? "Removed accessory!" : `${acc.emoji} Equipped!`);
  };

  const renamePet = () => {
    if (!newName.trim()) return;
    const name = newName.trim().slice(0,16);
    setGs(p=>({...p, petName:name,
      journal:[...p.journal,{ts:Date.now(),text:`✏️ Renamed to "${name}"`}]}));
    setNaming(false); setNewName("");
    toast(`✨ Hello, ${name}!`);
  };

  const earnCoins = (amt) => {
    setGs(p=>({...p, coins:p.coins+amt, totalGames:p.totalGames+1,
      xp:p.xp+Math.round(amt/4), friendship:p.friendship+3}));
    toast(`🎮 Earned ${amt} coins!`);
  };

  const claimBonus = () => {
    if (gs.loginClaimed) return;
    const bonus = 30 + gs.careStreak*5;
    setGs(p=>({...p, loginClaimed:true, coins:p.coins+bonus,
      journal:[...p.journal,{ts:Date.now(),text:`🎁 Daily login bonus: +${bonus} coins!`}]}));
    toast(`🎁 Daily Bonus: +${bonus} coins!`);
  };

  const resetGame = () => {
    if (!confirm("Start a new game? All progress will be lost!")) return;
    localStorage.removeItem("lumipet_v3");
    setGs(INIT); setTab("home");
    toast("🌟 New journey begins!");
  };

  // ── Derived values ───────────────────────────────────
  const stage    = STAGES[gs.stageIdx] || STAGES[0];
  const weather  = WEATHERS[gs.weather] || WEATHERS[0];
  const xpToNext = gs.stageIdx < STAGE_XP.length-1 ? STAGE_XP[gs.stageIdx+1] : null;
  const xpPct    = xpToNext ? Math.min(100,(gs.xp/xpToNext)*100) : 100;
  const pers     = PERSONALITIES[gs.personality] || PERSONALITIES.curious;
  const unlockedCount = ACHIEVEMENTS.filter(a=>gs.achievements.includes(a.id)).length;

  const foodCount = id => gs.inv.food.filter(f=>f.id===id).length;
  const medCount  = id => gs.inv.medicine.filter(m=>m.id===id).length;
  const hasToy    = id => gs.inv.toys.some(t=>t.id===id);

  const skies = {
    dawn:  "linear-gradient(170deg,#0d0520 0%,#3d1050 40%,#7a2560 70%,#c05030 100%)",
    day:   "linear-gradient(170deg,#050215 0%,#0f0835 45%,#1a1060 100%)",
    dusk:  "linear-gradient(170deg,#0a0520 0%,#2a0840 45%,#6b1530 70%,#d4602a 100%)",
    night: "linear-gradient(170deg,#000008 0%,#050018 50%,#0a0825 100%)",
  };
  const bgSky = skies[gs.timeOfDay] || skies.day;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');
        *{ box-sizing:border-box; margin:0; padding:0; }
        body{ background:#000010; }
        ::-webkit-scrollbar{ width:4px; }
        ::-webkit-scrollbar-thumb{ background:rgba(200,168,233,0.25); border-radius:4px; }
        ::-webkit-scrollbar-track{ background:transparent; }

        @keyframes petBob    { 0%,100%{ transform:translateY(0)        } 50%{ transform:translateY(-9px)     } }
        @keyframes petJump   { 0%    { transform:translateY(0) rotate(-6deg) } 100%{ transform:translateY(-22px) rotate(6deg) } }
        @keyframes petWiggle { 0%,100%{ transform:rotate(-7deg) } 50%{ transform:rotate(7deg) } }
        @keyframes petSpin   { from{ transform:rotate(0deg)  } to{ transform:rotate(360deg) } }
        @keyframes petBounce { 0%,100%{ transform:translateY(0)  } 30%{ transform:translateY(-15px) } 60%{ transform:translateY(-6px) } }
        @keyframes floatUp   { 0%{ transform:translateY(0);opacity:1 } 100%{ transform:translateY(-65px);opacity:0 } }
        @keyframes floatBubble{ 0%,100%{ transform:translateY(0) scale(1) } 50%{ transform:translateY(-6px) scale(1.1) } }
        @keyframes twinkle   { 0%,100%{ opacity:.2; transform:scale(1) } 50%{ opacity:.9; transform:scale(1.3) } }
        @keyframes slideDown { from{ transform:translateY(-18px);opacity:0 } to{ transform:translateY(0);opacity:1 } }
        @keyframes pulseGlow { 0%,100%{ box-shadow:0 0 12px rgba(200,168,233,.25) } 50%{ box-shadow:0 0 28px rgba(200,168,233,.65) } }
        @keyframes starSpin  { from{ transform:rotate(0deg) } to{ transform:rotate(360deg) } }
        @keyframes shimmer   { 0%,100%{ opacity:.6 } 50%{ opacity:1 } }
        @keyframes bonusPulse{ 0%,100%{ transform:scale(1) } 50%{ transform:scale(1.05) } }

        .lumibtn:hover{ filter:brightness(1.25); transform:translateY(-2px); box-shadow:0 6px 20px rgba(200,168,233,.25)!important; }
        .lumibtn:active{ transform:translateY(0); }
        .lumi-card:hover{ border-color:rgba(200,168,233,.4)!important; transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,.3)!important; }
        .tab-item:hover{ background:rgba(200,168,233,.15)!important; }
        .shop-cat:hover{ border-color:rgba(200,168,233,.4)!important; }
      `}</style>

      <div style={{ minHeight:"100vh", background:bgSky,
        display:"flex", flexDirection:"column", alignItems:"center",
        padding:"14px 14px 24px", fontFamily:"'Nunito',sans-serif",
        transition:"background 4s ease", position:"relative", overflow:"hidden" }}>

        {/* ── Starfield ── */}
        {Array.from({length:35}).map((_,i)=>(
          <div key={i} style={{ position:"fixed",
            left:`${(i*37+11)%100}%`, top:`${(i*53+7)%100}%`,
            width:i%4===0?3:1.5, height:i%4===0?3:1.5,
            background:"#fff", borderRadius:"50%",
            animation:`twinkle ${1.4+(i%5)*0.35}s ease-in-out infinite`,
            animationDelay:`${(i*0.22)%3}s`, opacity:0.55,
            pointerEvents:"none" }} />
        ))}

        {/* ── Toast Notification ── */}
        {notif && (
          <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)",
            background:"rgba(18,10,40,0.96)", backdropFilter:"blur(14px)",
            border:"1px solid rgba(200,168,233,.5)", color:"#e8d5ff",
            padding:"10px 22px", borderRadius:30, fontSize:13.5, fontWeight:600,
            zIndex:1000, animation:"slideDown 0.3s ease",
            boxShadow:"0 4px 24px rgba(0,0,0,.5)", whiteSpace:"nowrap" }}>
            {notif}
          </div>
        )}

        <div style={{ width:"100%", maxWidth:490, display:"flex", flexDirection:"column", gap:11, position:"relative", zIndex:1 }}>

          {/* ╔═══════════════ HEADER ═══════════════╗ */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:24,
                color:"#e8d5ff", letterSpacing:1,
                textShadow:"0 0 20px rgba(200,168,233,.5)" }}>
                ✨ LumiPet
              </div>
              <div style={{ fontSize:11, color:"#9b8fc7", marginTop:-1 }}>
                {weather.icon} {weather.name} · {gs.timeOfDay} · {stage.icon} {stage.name}
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {!gs.loginClaimed && (
                <button onClick={claimBonus} className="lumibtn" style={{
                  ...bigBtn,
                  background:"linear-gradient(135deg,rgba(245,200,66,.4),rgba(255,140,40,.4))",
                  border:"1px solid rgba(245,200,66,.55)", color:"#f5c842",
                  fontSize:12, padding:"6px 12px",
                  animation:"bonusPulse 1.4s ease-in-out infinite",
                  boxShadow:"0 0 14px rgba(245,200,66,.3)",
                }}>🎁 Daily!</button>
              )}
              <div style={{ background:"rgba(245,200,66,.18)",
                border:"1px solid rgba(245,200,66,.4)",
                borderRadius:20, padding:"5px 14px",
                color:"#f5c842", fontSize:15, fontWeight:800 }}>
                💰 {gs.coins}
              </div>
            </div>
          </div>

          {/* ╔═══════════════ PET PANEL ═══════════════╗ */}
          <div style={{ ...panel, position:"relative", overflow:"hidden",
            animation:"pulseGlow 3.5s ease-in-out infinite" }}>

            {/* Decor room elements */}
            {gs.decor.length>0 && (
              <div style={{ position:"absolute", bottom:10, right:10,
                display:"flex", gap:5, fontSize:20, opacity:0.65 }}>
                {gs.decor.slice(0,5).map(d=><span key={d.id} title={d.name}>{d.emoji}</span>)}
              </div>
            )}

            {/* Pet header row */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div>
                {naming ? (
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <input value={newName} onChange={e=>setNewName(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&renamePet()}
                      placeholder="New name..." maxLength={16} style={inputStyle} autoFocus />
                    <button onClick={renamePet} style={{...miniBtn,color:"#4ade80",border:"1px solid rgba(74,222,128,.4)"}}>✓</button>
                    <button onClick={()=>setNaming(false)} style={{...miniBtn,color:"#ff7875",border:"1px solid rgba(255,120,117,.3)"}}>✕</button>
                  </div>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:"#e8d5ff" }}>{gs.petName}</span>
                    <button onClick={()=>setNaming(true)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, opacity:0.6 }}>✏️</button>
                  </div>
                )}
                <div style={{ fontSize:11, color:"#9b8fc7", marginTop:1 }}>
                  Lv.{gs.level} · {pers.emoji} {pers.label} · 💖 {gs.friendship}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                {gs.isSick && (
                  <div style={{ fontSize:12, color:"#ff4757", fontWeight:700,
                    animation:"shimmer 0.8s ease-in-out infinite", marginBottom:2 }}>
                    🤒 SICK! Use medicine!
                  </div>
                )}
                <div style={{ fontSize:11, color:"#9b8fc7" }}>
                  {gs.careStreak>0 && `🔥 ${gs.careStreak}d streak`}
                </div>
              </div>
            </div>

            {/* Pet + particles */}
            <div onClick={petThePet}
              style={{ display:"flex", justifyContent:"center", padding:"18px 0 10px", position:"relative", cursor:"pointer" }}>
              {particles.map(p=>(
                <div key={p.id} style={{ position:"absolute",
                  left:`${p.x}%`, top:`${p.y}%`, fontSize:17,
                  animation:"floatUp 1.5s ease forwards",
                  pointerEvents:"none", zIndex:10 }}>{p.emoji}</div>
              ))}
              <PetDisplay
                stageIdx={gs.stageIdx} mood={gs.petMood}
                acc={gs.equippedAcc} isAsleep={gs.isAsleep}
                isSick={gs.isSick} animState={anim} />
            </div>

            {/* Mood badge */}
            <div style={{ textAlign:"center", marginBottom:11 }}>
              <span style={{ fontSize:12, background:"rgba(255,255,255,.07)",
                borderRadius:20, padding:"3px 14px", color:"#ccc" }}>
                {{
                  happy:"😊 Happy", ecstatic:"🤩 Ecstatic!", sad:"😢 Sad",
                  hungry:"🍽️ Hungry", bored:"😑 Bored", sick:"🤒 Sick",
                  dirty:"🤢 Dirty", sleeping:"💤 Sleeping",
                }[gs.petMood]||"😊 Okay"}
                {" · "}{weather.icon} {weather.name}
              </span>
            </div>

            {/* XP bar */}
            <div style={{ marginBottom:3 }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                fontSize:10.5, color:"#9b8fc7", marginBottom:3 }}>
                <span>⚡ {Math.round(gs.xp)} XP</span>
                <span>{xpToNext ? `Next stage at ${xpToNext}` : "✨ Max Stage!"}</span>
              </div>
              <div style={{ height:5, background:"rgba(255,255,255,.07)", borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${xpPct}%`,
                  background:"linear-gradient(90deg,#c8a8e9,#f5c842)",
                  borderRadius:3, transition:"width 0.7s ease",
                  boxShadow:"0 0 6px rgba(200,168,233,.5)" }} />
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display:"flex", gap:7, marginTop:13, flexWrap:"wrap" }}>
              {[
                { emoji:"🍽️", label:"Feed",     fn:()=>setTab("inventory") },
                { emoji:"🎮",  label:"Play",     fn:()=>setTab("games")     },
                { emoji:"🛁",  label:"Bathe",    fn:bathePet                },
                { emoji:gs.isAsleep?"☀️":"💤",
                  label:gs.isAsleep?"Wake":"Sleep", fn:toggleSleep          },
                { emoji:"💊",  label:"Medicine", fn:()=>setTab("inventory") },
              ].map(b => (
                <button key={b.label} onClick={b.fn} className="lumibtn" style={{
                  flex:1, minWidth:54, ...bigBtn, padding:"7px 4px",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:2, fontSize:11,
                }}>
                  <span style={{ fontSize:19 }}>{b.emoji}</span>
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* ╔═══════════════ STATS PANEL ═══════════════╗ */}
          <div style={panel}>
            <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14,
              color:"#c8a8e9", marginBottom:11 }}>📊 Vitals</div>
            <StatBar label="Hunger"      value={gs.stats.hunger} icon="🍽️" color="#f5c842" />
            <StatBar label="Happiness"   value={gs.stats.happy}  icon="😊" color="#ff9eb5" />
            <StatBar label="Health"      value={gs.stats.health} icon="❤️" color="#4ade80" />
            <StatBar label="Energy"      value={gs.stats.nrg}    icon="⚡" color="#60a5fa" />
            <StatBar label="Cleanliness" value={gs.stats.clean}  icon="✨" color="#34d399" />
          </div>

          {/* ╔═══════════════ NAV TABS ═══════════════╗ */}
          <div style={{ display:"flex", gap:5,
            background:"rgba(8,4,22,.65)", borderRadius:16, padding:6,
            border:"1px solid rgba(255,255,255,.06)" }}>
            {[
              { id:"home",      emoji:"🏠", label:"Home"    },
              { id:"inventory", emoji:"🎒", label:"Bag"     },
              { id:"shop",      emoji:"🛍️", label:"Shop"    },
              { id:"games",     emoji:"🎮", label:"Games"   },
              { id:"profile",   emoji:"📋", label:"Profile" },
            ].map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} className="tab-item" style={{
                flex:1,
                background:tab===t.id?"rgba(200,168,233,.25)":"transparent",
                border:`1px solid ${tab===t.id?"rgba(200,168,233,.4)":"transparent"}`,
                borderRadius:11, color:tab===t.id?"#e8d5ff":"#9b8fc7",
                padding:"6px 3px", cursor:"pointer", fontSize:10.5,
                fontFamily:"inherit", transition:"all 0.2s ease",
                display:"flex", flexDirection:"column", alignItems:"center", gap:2,
              }}>
                <span style={{ fontSize:17 }}>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* ╔═══════════════ TAB CONTENT ═══════════════╗ */}

          {/* ── HOME ─────────────────────────────────── */}
          {tab==="home" && (
            <div style={{ display:"flex", flexDirection:"column", gap:11 }}>

              {/* Info cards */}
              <div style={panel}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14,
                  color:"#c8a8e9", marginBottom:10 }}>🌟 About {gs.petName}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                  {[
                    { label:"Stage",        val:`${stage.icon} ${stage.name}` },
                    { label:"Level",        val:`⭐ ${gs.level}`              },
                    { label:"Personality",  val:`${pers.emoji} ${pers.label}` },
                    { label:"Care Streak",  val:`🔥 ${gs.careStreak}d`        },
                    { label:"Friendship",   val:`💖 ${gs.friendship}`          },
                    { label:"Interactions", val:`🤝 ${gs.totalInteractions}`   },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ background:"rgba(255,255,255,.04)",
                      borderRadius:11, padding:"8px 11px",
                      border:"1px solid rgba(255,255,255,.06)" }}>
                      <div style={{ fontSize:10, color:"#9b8fc7", marginBottom:2 }}>{label}</div>
                      <div style={{ fontSize:13, color:"#e8d5ff", fontWeight:700 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wardrobe */}
              {gs.accessories.length>0 && (
                <div style={panel}>
                  <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14,
                    color:"#c8a8e9", marginBottom:10 }}>👒 Wardrobe</div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {gs.accessories.map(acc=>(
                      <button key={acc.id} onClick={()=>equipAcc(acc)} className="lumibtn" style={{
                        ...miniBtn, padding:"6px 14px", fontSize:12,
                        background:gs.equippedAcc?.id===acc.id
                          ?"rgba(200,168,233,.35)":"rgba(255,255,255,.05)",
                        border:`1px solid ${gs.equippedAcc?.id===acc.id
                          ?"rgba(200,168,233,.6)":"rgba(255,255,255,.1)"}`,
                        color:"#e8d5ff",
                      }}>
                        {acc.emoji} {acc.name}
                        {gs.equippedAcc?.id===acc.id && <span style={{ marginLeft:5, color:"#4ade80" }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Room */}
              {gs.decor.length>0 && (
                <div style={panel}>
                  <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14,
                    color:"#c8a8e9", marginBottom:9 }}>🏠 Room</div>
                  <div style={{ background:"rgba(255,255,255,.03)", borderRadius:13,
                    padding:"14px 16px", border:"1px solid rgba(255,255,255,.05)",
                    display:"flex", gap:14, flexWrap:"wrap", minHeight:60 }}>
                    {gs.decor.map(d=>(
                      <div key={d.id} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:28 }}>{d.emoji}</div>
                        <div style={{ fontSize:9, color:"#9b8fc7", marginTop:2 }}>{d.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Journal */}
              <div style={panel}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14, color:"#c8a8e9" }}>📖 Journal</div>
                  <button onClick={()=>setLogExpand(!logExpand)} style={{ ...miniBtn, fontSize:11 }}>
                    {logExpand?"Collapse":"Expand"}
                  </button>
                </div>
                <div style={{ maxHeight:logExpand?220:85, overflowY:"auto",
                  display:"flex", flexDirection:"column", gap:3 }}>
                  {[...gs.journal].reverse().map((e,i)=>(
                    <div key={i} style={{ fontSize:11.5, color:"#bbb", padding:"4px 0",
                      borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                      <span style={{ color:"#9b8fc7", fontSize:10 }}>
                        {new Date(e.ts).toLocaleDateString("de-DE")} ·{" "}
                      </span>
                      {e.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── INVENTORY ────────────────────────────── */}
          {tab==="inventory" && (
            <div style={{ display:"flex", flexDirection:"column", gap:11 }}>

              {/* Food */}
              <div style={panel}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14,
                  color:"#c8a8e9", marginBottom:11 }}>🍽️ Food Stash</div>
                {SHOP.food.filter(f=>foodCount(f.id)>0).length===0 ? (
                  <div style={{ color:"#9b8fc7", textAlign:"center", padding:"18px 0", fontSize:13 }}>
                    Bag is empty. Visit the Shop! 🛍️
                  </div>
                ) : SHOP.food.filter(f=>foodCount(f.id)>0).map(item=>(
                  <div key={item.id} className="lumi-card" style={{
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    background:"rgba(255,255,255,.04)", borderRadius:12, padding:"9px 13px",
                    border:"1px solid rgba(255,255,255,.07)", marginBottom:7,
                    transition:"all 0.2s ease",
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:26 }}>{item.emoji}</span>
                      <div>
                        <div style={{ fontSize:13, color:"#e8d5ff", fontWeight:700 }}>{item.name}</div>
                        <div style={{ fontSize:11, color:"#9b8fc7", marginTop:1 }}>
                          {item.hunger?`🍽️+${item.hunger} `:""}
                          {item.happy?`😊+${item.happy} `:""}
                          {item.health?`❤️+${item.health}`:""}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:12, color:"#9b8fc7" }}>×{foodCount(item.id)}</span>
                      <button onClick={()=>feedItem(item)} className="lumibtn" style={{ ...bigBtn, padding:"5px 14px", fontSize:12 }}>Feed</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Toys */}
              <div style={panel}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14,
                  color:"#c8a8e9", marginBottom:11 }}>🎮 Toy Chest</div>
                {gs.inv.toys.length===0 ? (
                  <div style={{ color:"#9b8fc7", textAlign:"center", padding:"18px 0", fontSize:13 }}>
                    No toys yet. Shop for some! 🎮
                  </div>
                ) : [...new Map(gs.inv.toys.map(t=>[t.id,t])).values()].map(item=>(
                  <div key={item.id} className="lumi-card" style={{
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    background:"rgba(255,255,255,.04)", borderRadius:12, padding:"9px 13px",
                    border:"1px solid rgba(255,255,255,.07)", marginBottom:7,
                    transition:"all 0.2s ease",
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:26 }}>{item.emoji}</span>
                      <div>
                        <div style={{ fontSize:13, color:"#e8d5ff", fontWeight:700 }}>{item.name}</div>
                        <div style={{ fontSize:11, color:"#9b8fc7", marginTop:1 }}>
                          😊+{item.happy} ⚡{item.nrg} ✨+{item.xp}xp
                        </div>
                      </div>
                    </div>
                    <button onClick={()=>useToy(item)} className="lumibtn" style={{ ...bigBtn, padding:"5px 14px", fontSize:12 }}>Play!</button>
                  </div>
                ))}
              </div>

              {/* Medicine */}
              <div style={panel}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14,
                  color:"#c8a8e9", marginBottom:11 }}>💊 Medicine Cabinet</div>
                {SHOP.medicine.filter(m=>medCount(m.id)>0).length===0 ? (
                  <div style={{ color:"#9b8fc7", textAlign:"center", padding:"18px 0", fontSize:13 }}>
                    No medicine in stock. 🛍️
                  </div>
                ) : SHOP.medicine.filter(m=>medCount(m.id)>0).map(item=>(
                  <div key={item.id} className="lumi-card" style={{
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    background:"rgba(255,255,255,.04)", borderRadius:12, padding:"9px 13px",
                    border:`1px solid ${gs.isSick?"rgba(74,222,128,.3)":"rgba(255,255,255,.07)"}`,
                    marginBottom:7, transition:"all 0.2s ease",
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:26 }}>{item.emoji}</span>
                      <div>
                        <div style={{ fontSize:13, color:"#e8d5ff", fontWeight:700 }}>{item.name}</div>
                        <div style={{ fontSize:11, color:"#9b8fc7", marginTop:1 }}>
                          ❤️+{item.health} {item.cures?"· ✅ Cures illness":""}
                          {item.nrg?` ⚡+${item.nrg}`:""}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:7, alignItems:"center" }}>
                      <span style={{ fontSize:12, color:"#9b8fc7" }}>×{medCount(item.id)}</span>
                      <button onClick={()=>useMedicine(item)} className="lumibtn" style={{
                        ...bigBtn, padding:"5px 14px", fontSize:12,
                        background:gs.isSick?"linear-gradient(135deg,rgba(74,222,128,.4),rgba(34,197,94,.3))":undefined,
                        border:gs.isSick?"1px solid rgba(74,222,128,.5)":undefined,
                      }}>Use</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SHOP ──────────────────────────────────── */}
          {tab==="shop" && (
            <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
              {/* Category pills */}
              <div style={{ display:"flex", gap:6 }}>
                {["food","toys","medicine","accessories","decor"].map(cat=>(
                  <button key={cat} onClick={()=>setShopCat(cat)} className="shop-cat" style={{
                    flex:1,
                    background:shopCat===cat?"rgba(200,168,233,.3)":"rgba(255,255,255,.05)",
                    border:`1px solid ${shopCat===cat?"rgba(200,168,233,.5)":"rgba(255,255,255,.08)"}`,
                    borderRadius:11, padding:"5px 2px",
                    color:shopCat===cat?"#e8d5ff":"#9b8fc7",
                    fontSize:9.5, cursor:"pointer", fontFamily:"inherit",
                    transition:"all 0.2s ease",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:1,
                  }}>
                    <span style={{ fontSize:16 }}>
                      {cat==="food"?"🍽️":cat==="toys"?"🎮":cat==="medicine"?"💊":cat==="accessories"?"👒":"🏡"}
                    </span>
                    {cat.charAt(0).toUpperCase()+cat.slice(1)}
                  </button>
                ))}
              </div>

              <div style={panel}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:13 }}>
                  <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14, color:"#c8a8e9" }}>
                    🛍️ {shopCat.charAt(0).toUpperCase()+shopCat.slice(1)} Shop
                  </div>
                  <div style={{ color:"#f5c842", fontSize:13, fontWeight:700 }}>💰 {gs.coins}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                  {(SHOP[shopCat]||[]).map(item=>{
                    const owned = (shopCat==="accessories"&&gs.accessories.find(a=>a.id===item.id))||
                                  (shopCat==="decor"&&gs.decor.find(d=>d.id===item.id));
                    const canAfford = gs.coins>=item.price;
                    return (
                      <div key={item.id} className="lumi-card" style={{
                        display:"flex", justifyContent:"space-between", alignItems:"center",
                        background:"rgba(255,255,255,.04)", borderRadius:13, padding:"10px 13px",
                        border:`1px solid ${owned?"rgba(74,222,128,.25)":"rgba(255,255,255,.07)"}`,
                        transition:"all 0.2s ease", opacity:owned?0.7:1,
                      }}>
                        <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                          <span style={{ fontSize:28 }}>{item.emoji}</span>
                          <div>
                            <div style={{ fontSize:13, color:"#e8d5ff", fontWeight:700 }}>
                              {item.name}
                              {owned && <span style={{ fontSize:10, color:"#4ade80", marginLeft:6 }}>✓ Owned</span>}
                            </div>
                            <div style={{ fontSize:11, color:"#9b8fc7", marginTop:1 }}>
                              {item.hunger?`🍽️+${item.hunger} `:""}
                              {item.happy?`😊+${item.happy} `:""}
                              {item.health?`❤️+${item.health} `:""}
                              {item.nrg&&item.nrg>0?`⚡+${item.nrg} `:""}
                              {item.nrg&&item.nrg<0?`⚡${item.nrg} `:""}
                              {item.xp?`✨+${item.xp}xp `:""}
                              {item.cures?"💊 Cures illness":""}
                            </div>
                          </div>
                        </div>
                        <button onClick={()=>!owned&&buyItem(shopCat,item)}
                          className="lumibtn"
                          disabled={!canAfford||owned}
                          style={{
                            ...bigBtn, padding:"6px 13px", fontSize:12,
                            background:owned?"rgba(74,222,128,.18)":
                                       !canAfford?"rgba(255,100,100,.15)":
                                       "linear-gradient(135deg,rgba(200,168,233,.35),rgba(155,143,199,.25))",
                            border:owned?"1px solid rgba(74,222,128,.35)":
                                   !canAfford?"1px solid rgba(255,100,100,.3)":
                                   "1px solid rgba(200,168,233,.5)",
                            color:!canAfford&&!owned?"#ff7875":"#e8d5ff",
                            cursor:owned||!canAfford?"default":"pointer",
                          }}>
                          {owned?"✓":!canAfford?"💸":  `💰 ${item.price}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── GAMES ──────────────────────────────────── */}
          {tab==="games" && (
            <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
              {game ? (
                <div style={{ ...panel, height:430, display:"flex", flexDirection:"column" }}>
                  {game==="stars"  && <StarCatcher  onClose={()=>setGame(null)} onEarn={earnCoins} />}
                  {game==="memory" && <MemoryMatch   onClose={()=>setGame(null)} onEarn={earnCoins} />}
                </div>
              ) : (
                <div style={panel}>
                  <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14,
                    color:"#c8a8e9", marginBottom:13 }}>🎮 Mini-Games</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                    {[
                      { id:"stars",  emoji:"⭐", name:"Star Catcher",
                        desc:"Catch falling stars in 25 seconds. Gold & rainbow stars worth more!",
                        reward:"Up to ~60+ coins" },
                      { id:"memory", emoji:"🧩", name:"Memory Match",
                        desc:"Flip cards to find matching pairs. Fewer moves = more coins!",
                        reward:"Up to ~220 coins" },
                    ].map(g=>(
                      <div key={g.id} style={{ background:"rgba(255,255,255,.04)",
                        borderRadius:15, padding:15,
                        border:"1px solid rgba(255,255,255,.07)" }}>
                        <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:10 }}>
                          <span style={{ fontSize:36 }}>{g.emoji}</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:15, color:"#e8d5ff", fontWeight:800 }}>{g.name}</div>
                            <div style={{ fontSize:11, color:"#9b8fc7", marginTop:3, lineHeight:1.5 }}>{g.desc}</div>
                            <div style={{ fontSize:11, color:"#f5c842", marginTop:4 }}>💰 {g.reward}</div>
                          </div>
                        </div>
                        <button onClick={()=>setGame(g.id)} className="lumibtn" style={{
                          ...bigBtn, width:"100%", fontWeight:700, fontSize:14 }}>
                          Play {g.name} →
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:11.5, color:"#9b8fc7", textAlign:"center", marginTop:13 }}>
                    Games played total: {gs.totalGames} · Games also grant XP & friendship!
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PROFILE ────────────────────────────────── */}
          {tab==="profile" && (
            <div style={{ display:"flex", flexDirection:"column", gap:11 }}>

              {/* Achievements */}
              <div style={panel}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14,
                  color:"#c8a8e9", marginBottom:12 }}>
                  🏆 Achievements ({unlockedCount}/{ACHIEVEMENTS.length})
                </div>
                {/* Progress bar */}
                <div style={{ height:5, background:"rgba(255,255,255,.07)", borderRadius:3, marginBottom:13, overflow:"hidden" }}>
                  <div style={{ height:"100%",
                    width:`${(unlockedCount/ACHIEVEMENTS.length)*100}%`,
                    background:"linear-gradient(90deg,#f5c842,#ff9eb5)",
                    borderRadius:3, transition:"width 0.6s ease" }} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                  {ACHIEVEMENTS.map(ach=>{
                    const done = gs.achievements.includes(ach.id);
                    return (
                      <div key={ach.id} style={{
                        background:done?"rgba(245,200,66,.1)":"rgba(255,255,255,.03)",
                        border:`1px solid ${done?"rgba(245,200,66,.3)":"rgba(255,255,255,.05)"}`,
                        borderRadius:11, padding:"9px 10px",
                        opacity:done?1:0.45, transition:"all 0.3s ease",
                      }}>
                        <div style={{ fontSize:20, marginBottom:3 }}>{done?ach.emoji:"🔒"}</div>
                        <div style={{ fontSize:11.5, color:done?"#f5c842":"#9b8fc7", fontWeight:700 }}>{ach.name}</div>
                        <div style={{ fontSize:10, color:"#777", marginTop:2, lineHeight:1.4 }}>{ach.desc}</div>
                        {done&&ach.reward>0&&(
                          <div style={{ fontSize:10, color:"#f5c842", marginTop:3 }}>+{ach.reward} coins</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lifetime Stats */}
              <div style={panel}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14,
                  color:"#c8a8e9", marginBottom:12 }}>📊 Lifetime Stats</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                  {[
                    { icon:"🍽️", label:"Feeds",        val:gs.totalFeeds        },
                    { icon:"🛁", label:"Baths",         val:gs.totalBaths        },
                    { icon:"💊", label:"Cures",         val:gs.totalCures        },
                    { icon:"🎮",  label:"Games",        val:gs.totalGames        },
                    { icon:"🤝",  label:"Interactions", val:gs.totalInteractions },
                    { icon:"⭐",  label:"Total XP",     val:Math.round(gs.xp)   },
                    { icon:"💖",  label:"Friendship",   val:gs.friendship        },
                    { icon:"🏆",  label:"Achievements", val:`${unlockedCount}/${ACHIEVEMENTS.length}` },
                  ].map(({ icon, label, val })=>(
                    <div key={label} style={{
                      background:"rgba(255,255,255,.04)", borderRadius:11,
                      padding:"8px 12px", border:"1px solid rgba(255,255,255,.06)",
                      display:"flex", alignItems:"center", gap:9,
                    }}>
                      <span style={{ fontSize:20 }}>{icon}</span>
                      <div>
                        <div style={{ fontSize:16, color:"#e8d5ff", fontWeight:800 }}>{val}</div>
                        <div style={{ fontSize:10, color:"#9b8fc7" }}>{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evolution path */}
              <div style={panel}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14,
                  color:"#c8a8e9", marginBottom:10 }}>🦋 Evolution Path</div>
                <div style={{ display:"flex", gap:6, overflowX:"auto" }}>
                  {STAGES.map((s,i)=>(
                    <div key={i} style={{
                      flex:"0 0 auto", textAlign:"center", padding:"10px 12px",
                      background:gs.stageIdx===i?"rgba(200,168,233,.25)":
                                 gs.stageIdx>i?"rgba(74,222,128,.1)":"rgba(255,255,255,.03)",
                      border:`1px solid ${gs.stageIdx===i?"rgba(200,168,233,.6)":
                              gs.stageIdx>i?"rgba(74,222,128,.3)":"rgba(255,255,255,.06)"}`,
                      borderRadius:12, minWidth:70,
                    }}>
                      <div style={{ fontSize:22 }}>{gs.stageIdx>=i?s.icon:"🔒"}</div>
                      <div style={{ fontSize:10, color:"#e8d5ff", marginTop:4, fontWeight:600 }}>{s.name}</div>
                      <div style={{ fontSize:9, color:"#9b8fc7", marginTop:1 }}>{STAGE_XP[i]} XP</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div style={panel}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14,
                  color:"#c8a8e9", marginBottom:11 }}>⚙️ Settings</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <div style={{ fontSize:12, color:"#9b8fc7", padding:"8px 12px",
                    background:"rgba(255,255,255,.03)", borderRadius:10,
                    border:"1px solid rgba(255,255,255,.05)" }}>
                    💾 Game auto-saves to your browser's local storage.
                    Tap your pet anytime to show love and gain friendship! 💖
                  </div>
                  <button onClick={resetGame} className="lumibtn" style={{
                    ...bigBtn,
                    background:"rgba(255,80,80,.15)",
                    border:"1px solid rgba(255,80,80,.3)",
                    color:"#ff7875", width:"100%", fontWeight:700,
                  }}>
                    🗑️ Start New Game (Resets All Progress)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign:"center", fontSize:10, color:"#444", paddingBottom:6 }}>
            ✨ LumiPet · Click your pet to give love · Auto-saves · 30 features
          </div>
        </div>
      </div>
    </>
  );
}
