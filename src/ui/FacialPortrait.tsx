import { useId } from 'react';
import { composePortrait,type PortraitContext } from '../character/composition';

/** All anatomy and clothing share one artboard; face parts are constrained inside fixed attachment anchors. */
export function FacialPortrait({context}:{context:PortraitContext}){
 const uid=useId().replace(/:/g,''),c=composePortrait(context),f=c.phenotype.features,female=c.sex==='female';
 const ink='#333c39',hair=c.maturity>.8?'#999d94':c.maturity>.6?'#474a46':'#252e2e';
 const width=53*c.phenotype.width,chin=219+f.faceLength*18,jaw=19+f.jaw*21,cheek=width+f.cheek*4;
 const eyes=23+f.eyeSpacing*10,eyeW=10+f.eyeWidth*6,eyeH=3.5+f.eyeWidth*2.5,tilt=(f.eyeTilt-.5)*10;
 const noseY=179+f.noseLength*16,noseW=6+f.noseWidth*7,mouthY=noseY+17,mouthW=12+f.mouth*12;
 const skin=`hsl(29 32% ${82-c.phenotype.pigment*.16}%)`,light=`hsl(34 43% ${91-c.phenotype.pigment*.12}%)`;
 const robe=c.office==='ruler'?'#806556':c.office==='commander'?'#4c6367':c.northern?'#67657b':'#6e887e';
 const face=`M${200-width} 124C${196-width} 102 ${170} 85 201 89C${240} 88 ${202+width} 105 ${199+width} 133L${199+cheek*.91} 171Q${201+width*.85} 202 ${207+jaw*.8} ${chin-8}Q211 ${chin+8} ${199-jaw} ${chin-8}Q${198-width} 210 ${198-cheek} 170Z`;
 const eyePath=`M${-eyeW} 0Q-1 ${-eyeH*1.6} ${eyeW} ${-tilt}Q2 ${eyeH} ${-eyeW} 0Z`;
 return <svg className="facial-portrait" viewBox="0 0 400 440" aria-hidden="true" focusable="false">
 <defs>
 <linearGradient id={uid+'skin'} x1="0" x2="1" y1="0" y2=".3"><stop stopColor={skin}/><stop offset=".26" stopColor={light}/><stop offset=".65" stopColor={light}/><stop offset="1" stopColor={skin}/></linearGradient>
 <linearGradient id={uid+'robe'} x1="0" x2="1"><stop stopColor="#364b4b"/><stop offset=".32" stopColor={robe}/><stop offset=".72" stopColor={robe}/><stop offset="1" stopColor="#4a5856"/></linearGradient>
 <radialGradient id={uid+'wash'}><stop stopColor="#eeeae0"/><stop offset="1" stopColor="#d6dbcf"/></radialGradient>
 <clipPath id={uid+'face'}><path d={face}/></clipPath>
 <clipPath id={uid+'eye'}><path d={eyePath}/></clipPath>
 <pattern id={uid+'weave'} width="5" height="5" patternUnits="userSpaceOnUse"><path d="M.5 1l.7 .3M3 4l.4-.8" stroke="#556459" strokeOpacity=".1" strokeWidth=".45"/></pattern>
 </defs>
 <rect width="400" height="440" fill={`url(#${uid}wash)`}/>
 <path d="M38 420Q57 302 78 206M314 95q-4 157 58 240" fill="none" stroke="#8d9b8b" opacity=".1" strokeWidth="23"/>
 {/* Asymmetric half-length silhouette: shoulder, elbow and waist do not form concentric bells. */}
 <path d="M174 204L165 257L194 289L227 250L218 204Z" fill={`url(#${uid}skin)`} stroke="#9d8a71" strokeWidth=".7"/>
 <path d="M179 227q14 18 37 2l-3 22-22 17-21-14Z" fill="#8e715d" opacity=".15"/>
 <path d="M168 242C131 249 87 251 76 286L52 343L64 411L96 440H316L333 363L310 279Q299 238 223 237L194 271Z" fill={`url(#${uid}robe)`} stroke={ink} strokeWidth="1.2"/>
 <path d="M96 268Q75 290 61 336L74 369Q103 338 138 330L133 285Z" fill="#c2c9b9" opacity=".35"/>
 <path d="M167 241L195 272L220 237L239 249L205 299L153 258Z" fill="#e6e4d6" stroke="#8d9181" strokeWidth=".85"/>
 <path d="M151 250L211 297L239 247L249 261L220 323L136 265Z" fill={c.northern?'#464856':'#425950'} stroke="#9dafa1" strokeWidth="1"/>
 <path d="M164 261l54 51M231 258l-22 31" stroke="#d9d8c0" strokeWidth="1" fill="none"/>
 {/* Long broken contour strokes follow fabric tension rather than repeated straight stripes. */}
 <g fill="none" stroke="#2b4141" strokeLinecap="round" opacity=".65">
 <path d="M111 270Q112 285 89 322Q87 329 91 338M131 289q-4 19-13 25M276 261Q297 291 292 315M290 302q14 29 10 45" strokeWidth="1.4"/>
 <path d="M137 324q-9 40-7 67M139 398l-2 27M237 324q-8 27 3 53l22 61M268 359q10 28 8 51M179 343q8 49-2 94" strokeWidth=".8"/>
 <path d="M77 347q-1 22 12 32M105 375q9 18 10 43M287 346q14 15 17 37M156 281q20 23 35 31" strokeWidth="2"/>
 </g>
 <g fill="none" stroke="#ced7c4" strokeWidth=".85" opacity=".45"><path d="M104 279q-3 20-16 38M126 329q-11 34-8 48M252 312q-11 38 6 58M291 276q16 33 12 41M174 366q6 30-4 54"/></g>
 {c.office==='commander'&&<g stroke="#a3aaa0" strokeWidth=".65"><path d="M113 262L145 261L181 306L166 411L111 418L98 311Z M242 253L282 263L292 313L271 400L225 412L226 306Z" fill="#354b50"/>{Array.from({length:8},(_,row)=>[0,1].map(side=><g key={row+'-'+side} transform={`translate(${side?237:114} ${305+row*12}) rotate(${side?-7:6})`}>{Array.from({length:4},(_,col)=><path key={col} d={`M${col*11} 0v7q4 6 9 0V0`} fill={row%2?'#667977':'#4b6568'}/>)}</g>))}<path d="M89 277Q113 249 146 258L157 280L106 307Z M242 250Q280 246 308 270L291 296L234 274Z" fill="#84938a"/><path d="M106 292l37-18M247 264l41 12" stroke="#d1c8a9" strokeWidth="2"/></g>}
 {/* A turned sleeve and visible hand interrupt the old doll-like trunk. */}
 <path d="M67 335Q83 332 117 357L191 333L206 351Q174 385 115 399Q84 400 69 377Z" fill={`url(#${uid}robe)`} stroke={ink} strokeWidth="1.1"/>
 <path d="M72 347q33 44 66 33M88 343q19 18 40 27M117 391q33-7 56-23" fill="none" stroke="#b8c5b5" strokeWidth=".9" opacity=".5"/>
 <path d="M177 336L188 329L208 350L195 363Z" fill="#d9dccc" stroke="#6d7e73" strokeWidth=".8"/>
 <path d="M186 333Q202 320 213 321L242 329Q246 334 237 335L216 331L238 339Q242 345 233 345L213 339L230 347Q234 352 225 352L207 345Q199 349 194 343Z" fill={`url(#${uid}skin)`} stroke="#947b66" strokeWidth=".8"/>
 <path d="M207 326l23 6M201 333l21 7" fill="none" stroke="#b39c82" strokeWidth=".55"/>
 <g transform="translate(200 221) rotate(-5) scale(.81 .84) translate(-200 -221)">
 {/* Ears behind face, drawn from the same width anchor. */}
 {[-1,1].map(side=><g key={side} transform={`translate(${200+side*(width-1)} 163) scale(${side} 1)`}><path d={`M0 -19Q${14+f.ears*5} -22 12 2Q11 ${21+f.ears*6} 0 22Z`} fill={skin} stroke="#88664d"/><path d="M3-11Q12-16 9 3Q3-2 4 12" fill="none" stroke="#9d775a"/></g>)}
 <path d={face} fill={`url(#${uid}skin)`} stroke="#715941" strokeWidth=".85"/>
 <g clipPath={`url(#${uid}face)`}>
 <path d={`M143 116Q155 180 171 ${chin-8}L124 249V96Z`} fill="#916749" opacity=".14"/>
 <path d={`M258 111Q238 153 256 197L288 202V102Z`} fill="#fff0d6" opacity=".24"/>
 <path d={`M${200-cheek+5} 173q18 -8 30 4M${200+cheek-5} 173q-18 -8-30 4`} stroke="#9f7657" strokeWidth={.5+f.cheek} opacity=".17" fill="none"/>
 {c.maturity>.45&&<g fill="none" stroke="#a17d5e" strokeWidth=".8" opacity={c.maturity}><path d="M175 119q23-8 47-1M181 126q20-5 36-1M160 170l-9 4M240 170l9 4"/><path d={`M${187-noseW} ${noseY+1}q-12 10-9 24M${213+noseW} ${noseY+1}q12 10 9 24`}/>{c.maturity>.8&&<path d="M171 134q25-7 53-1M155 187q-3 15 6 26M245 187q3 15-6 26"/>}</g>}
 </g>
 {/* Eyes: sclera and iris share the exact eyelid clip, preventing detached pupils. */}
 {[-1,1].map(side=><g key={side} transform={`translate(${203+side*eyes} ${side===1?159:160}) scale(${side*(side===1?.9:1)} 1)`}>
 <path d={`M${-eyeW-2} -12Q0 ${-15-f.brow*7} ${eyeW+3} ${-14-tilt+(c.mood==='tense'?4:0)}`} stroke={hair} strokeWidth={female?1.3:1.3+f.brow*2} strokeLinecap="round" fill="none"/>
 <path d={eyePath} fill="#f0ece0" stroke="#55524a" strokeWidth=".7"/>
 <g clipPath={`url(#${uid}eye)`}><ellipse cx={side*2} cy="-1" rx="4" ry="5.2" fill="#64736a"/><ellipse cx={side*2} cy="-1" rx="2.1" ry="3.8" fill="#282a25"/><circle cx={side*2-1} cy="-2.5" r=".8" fill="#f5e7c8"/></g>
 <path d={`M${-eyeW} -2Q0 ${-eyeH*1.6-2} ${eyeW} ${-tilt-2}`} stroke="#84634c" strokeWidth=".8" fill="none" opacity=".7"/>
 <path d={`M${-eyeW+3} 5Q0 9 ${eyeW-2} ${3-tilt}`} stroke="#a37f60" strokeWidth=".7" fill="none"/>
 </g>)}
 {/* Nose planes and separate nostrils. */}
 <path d={`M205 167Q204 ${noseY-7} ${210-noseW} ${noseY}Q210 ${noseY+5} 217 ${noseY+1}`} fill="none" stroke="#9c7354" strokeWidth="1.2"/>
 <path d={`M208 164Q211 ${noseY-7} ${212+noseW} ${noseY}Q223 ${noseY+6} 215 ${noseY+5}`} fill="#ad8260" opacity=".26"/>
 <path d={`M${205-noseW} ${noseY+3}q3-4 6 0M${212+noseW} ${noseY+3}q-3-4-6 0`} fill="none" stroke="#73513e" strokeWidth="1.3"/>
 <path d={`M206 ${noseY+7}v4M209 ${noseY+7}v4`} stroke="#b88c6a" strokeWidth=".8"/>
 <g transform="translate(6 0)">
 {/* Upper and lower lip retain a common mouth anchor. */}
 <path d={`M${200-mouthW} ${mouthY}Q191 ${mouthY-2} 197 ${mouthY-3}Q200 ${mouthY-1} 203 ${mouthY-3}Q209 ${mouthY-2} ${200+mouthW} ${mouthY}Q201 ${mouthY+7} ${200-mouthW} ${mouthY}Z`} fill={female?'#ad7462':'#ac8068'} opacity=".8"/>
 <path d={`M${200-mouthW} ${mouthY}Q200 ${mouthY+1} ${200+mouthW} ${mouthY}`} stroke="#735344" strokeWidth="1" fill="none"/>
 <path d={`M190 ${mouthY+9}q10 4 20 0`} stroke="#ae886a" strokeWidth=".8" fill="none"/>
 </g>
 {c.beard!=='none'&&<g transform="translate(6 0)" fill="none" stroke={hair} strokeLinecap="round">
 {Array.from({length:17},(_,i)=>{const x=181+i*2.4,spread=(i-8)*1.7,len=c.beard==='long'?38+(8-Math.abs(i-8))*3:10+(8-Math.abs(i-8))*1.2;return <path key={i} d={`M${x} ${chin-10+Math.abs(i-8)*.25}q${spread*.2} ${len*.55} ${spread} ${len}`} strokeWidth={i%3===0?1.5:.7} opacity={.55+(i%3)*.15}/>;})}
 {[-1,1].map(side=><g key={side}>{Array.from({length:7},(_,i)=><path key={i} d={`M${200+side*(3+i)} ${mouthY-5-i*.4}q${side*10} 1 ${side*(15+i)} ${5+i*1.7}`} strokeWidth=".8"/>)}</g>)}
 </g>}
 {/* Hairline is anchored to the forehead, headwear cannot drift with independent image cropping. */}
 <path d={`M${200-width} 143Q${194-width} 109 ${204-width} 98Q200 67 ${198+width} 98Q${207+width} 117 ${200+width} 144L${194+width} 121Q242 112 232 103Q204 108 188 101Q156 112 ${206-width} 128Z`} fill={hair}/>
 <g fill="none" stroke={hair} strokeWidth=".65" opacity=".65">{Array.from({length:11},(_,i)=><path key={i} d={`M${151+i*9} ${112-Math.sin(i*.31)*10}q${i<5?-4:4} 9 ${i<5?-6:6} ${16+i%3*3}`}/>)}</g>
 {female?<g stroke={ink} fill={hair}><ellipse cx="175" cy="89" rx="24" ry="25"/><ellipse cx="218" cy="86" rx="23" ry="26"/><path d="M142 115Q152 78 195 96Q236 82 258 114L249 99Q199 55 151 94Z"/><path d="M162 83l75 7" stroke="#c3a575" strokeWidth="3"/><circle cx="239" cy="90" r="5" fill="#a8b9a1"/></g>:c.headwear==='tall-cap'?<g stroke={ink}><path d="M153 106L156 42Q197 29 237 44L246 106Q200 92 153 106Z" fill="#3c3d30"/><path d="M163 48Q200 37 231 48M165 52l-3 43M233 53l5 43M158 99q40-10 82 1" fill="none" stroke="#70674d" strokeWidth="1"/></g>:c.office==='ruler'?<g stroke={ink}><path d="M149 105L155 57Q200 43 245 57L251 105Q200 89 149 105Z" fill="#383b30"/><path d="M145 61L253 57L258 68L146 72Z" fill="#514f38" stroke="#b7a275"/><path d="M156 93q44-10 88 0" fill="none" stroke="#b7a275"/><path d="M198 57v32" stroke="#b69f6d" strokeWidth="4"/><circle cx="200" cy="93" r="4" fill="#b3c0a5"/></g>:<g stroke={ink}><path d={c.northern?'M143 112L151 76Q196 42 247 77L257 113Q201 93 143 112Z':'M146 109L155 74L188 58L219 61L245 81L253 111Q201 94 146 109Z'} fill={c.office==='commander'?'#4c5550':'#353f35'}/><path d="M146 105Q201 90 254 107M151 99Q200 86 251 101" stroke="#96866b" fill="none" strokeWidth="1"/>{c.office==='commander'&&<path d="M200 61v34M160 76l-5 18M239 77l6 17" stroke="#b4a078"/>}</g>}
 </g>
 {c.insignia&&<g transform="translate(271 340)" stroke="#8c7e59"><path d="M0-35v36" fill="none"/><rect x="-8" width="16" height="26" rx="3" fill={c.insignia==='jade'?'#a9b79b':'#b79b5d'}/><path d="M-3 5h6v14h-6Z" fill="none"/></g>}
 {c.ornament==='scroll'&&<g transform="translate(286 357) rotate(15)" stroke="#776c51"><rect width="20" height="65" fill="#d3c5a3"/><path d="M-3 3h26M-3 62h26M5 8v46M10 8v46"/><path d="M-1 32h22" stroke="#855d44" strokeWidth="3"/></g>}
 {c.ornament==='pouch'&&<path d="M283 367q-24 44 2 46q26-1 6-46Z" fill="#8e7051" stroke="#504432"/>}
 {c.ornament==='knot'&&<path d="M282 366v46m0-36l-9 10 9 10 9-10-9-10m-5 23-4 17m14-17 4 17" fill="none" stroke="#9b6751" strokeWidth="2"/>}
 <rect width="400" height="440" fill={`url(#${uid}weave)`} pointerEvents="none"/>
 </svg>;
}
