import './characterTraitIcons.css';

/** Original enamel-and-gold motifs; all share one engraved medallion and optical scale. */
export const characterTraitMotifs={
 greedy:<><path d="m25 15 14 0-3 8c9 5 12 12 9 20-3 7-23 7-26 0-3-8 0-15 9-20Z" fill="var(--glyph-accent)"/><path d="M25 23h14M27 18l4 5 5-5" fill="none"/><circle cx="30" cy="35" r="6"/><circle cx="38" cy="42" r="5"/><path d="M28 33h4v4h-4ZM36 40h4v4h-4Z" fill="var(--glyph-field)"/></>,
 honest:<><path d="M32 13v6m0 26v6" fill="none"/><path d="m20 19 12-3 12 3v23l-12 7-12-7Z" fill="var(--glyph-accent)"/><path d="m27 26 10 0v11H27Z"/><path d="M32 22v18m-8 3 8 3 8-3" fill="none"/></>,
 ambitious:<><path d="M16 47 26 29l8 10 8-14 8 22Z" fill="var(--glyph-accent)"/><path d="M33 39V13m1 1 14 4-14 7"/><path d="m20 45 6-10 8 10m4 0 4-10 5 10" fill="none"/></>,
 diligent:<><path d="M17 27c5-2 10-2 15 1 5-3 10-3 15-1v20c-5-2-10-2-15 1-5-3-10-3-15-1Z" fill="var(--glyph-accent)"/><path d="M32 29v18m-11-15 7 1m-7 5 7 1m8-6 7-1m-7 7 7-1" fill="none"/><path d="m25 22 13-10 4 4-13 10-7 1Z"/><path d="m22 27 3-5 4 4Z" fill="var(--glyph-field)"/></>,
 frugal:<><path d="M17 33h30c-1 6-5 9-12 9h-6c-7 0-11-3-12-9Z" fill="var(--glyph-accent)"/><path d="M32 42v6m-8 1h16M39 33l4-6" fill="none"/><path d="M43 26c-8-5-4-10 0-13 5 5 6 10 0 13Z"/><path d="M23 30h12m-17 5h25" fill="none"/></>,
 generous:<><path d="m16 39 8-3 10 4 11-5 4 4-13 10-13-4-7 1Z" fill="var(--glyph-accent)"/><path d="M24 36h9l6 5-3 3-10-4" fill="none"/><circle cx="31" cy="24" r="6"/><path d="M29 22h4v4h-4ZM24 15l-2-4m18 6 3-3m-12-3V8" fill="none"/></>,
 gregarious:<><path d="M15 28h14l-2 13H17ZM35 28h14l-2 13H37Z" fill="var(--glyph-accent)"/><path d="M15 29h14m6 0h14M22 41v6m20-6v6m-25 1h10m10 0h10" fill="none"/><path d="m21 21 7-5 4 5 4-5 7 5" fill="none"/><circle cx="32" cy="31" r="2"/></>,
 wary:<><path d="M32 16c8 6 15 10 18 17-5 10-12 15-18 17-8-3-15-10-18-17 4-7 10-12 18-17Z" fill="var(--glyph-accent)"/><path d="M18 33q14-17 28 0-14 17-28 0Z"/><circle cx="32" cy="33" r="5" fill="var(--glyph-field)"/><circle cx="34" cy="31" r="1" stroke="none"/><path d="m24 23 5-3m9 24 5-5" fill="none"/></>,
 steadfast:<><path d="m15 48 8-18 13-3 13 21Z" fill="var(--glyph-accent)"/><path d="m23 31 8 5-5 12m10-21 3 15 9 5M32 30V14m0 8-9-5m9 8 11-7" fill="none"/><path d="m18 18 7-4 5 7m4-2 7-6 7 4" fill="none"/></>,
 cold:<><path d="M16 23h23q10 0 8-7-2-6-8-2M14 32h29q9 0 7 7-2 6-8 3M19 42h13q7 0 5 6" fill="none" strokeWidth="3"/><path d="m19 13 4 4m-7 29-4 3M31 18v7m-4-4h8" fill="none"/></>,
 fever:<><path d="M33 12c3 8-5 11-3 18 6-1 7-6 6-10 12 10 15 18 8 26-7 8-23 5-26-5-4-11 5-17 7-25 0 8 0 11 4 12-1-7 3-9 4-16Z" fill="var(--glyph-accent)"/><path d="M32 31c7 7 9 10 5 15-4 5-11 0-9-5 1-4 4-6 4-10Z"/></>,
 flux:<><path d="M26 13h12v9c10 3 14 10 10 19-5 12-27 12-32 0-4-9 0-16 10-19Z" fill="var(--glyph-accent)"/><path d="M23 30q9-6 18 0m-19 6q9 7 19 0m-17 7q7-5 14 0M26 17h12" fill="none"/></>,
 wasting:<><path d="M31 48V23q0-10 10-10" fill="none" strokeWidth="2.5"/><path d="M31 29Q12 28 15 15q15 0 16 14ZM32 23q0-12 14-12 1 12-14 12Z" fill="var(--glyph-accent)"/><path d="M27 40q-11-8-14 2 8 8 14-2Z"/><path d="m18 20 10 7m9-11-4 5m-2 27-6 3m6-3 8 2" fill="none"/></>,
 buddhist:<><path d="M32 43C15 44 13 32 14 26c8 0 14 4 18 13 4-9 10-13 18-13 1 6-1 18-18 17Z" fill="var(--glyph-accent)"/><path d="M32 41C20 31 23 20 32 13c9 7 12 18 0 28Z"/><path d="M32 36c-4-8-3-13 0-17m-9 22-5-7m23 7 5-7M20 48h24M25 51h14" fill="none"/></>,
 'campaign-strain':<><path d="M20 28c0-9 5-16 12-16s12 7 12 16l5 7-8 5H23l-8-5Z" fill="var(--glyph-accent)"/><path d="M20 28h24M32 14v13m-9 14-2 8m20-8 2 8M21 49h22" fill="none"/><path d="m35 28-5 8 5 4-6 8" fill="none" strokeWidth="2.5"/><path d="m14 17-3-3m39 8 4-3" fill="none"/></>,
 injury:<><path d="m16 39 23-23 9 9-23 23Z" fill="var(--glyph-accent)"/><path d="m23 32 9 9m-5-13 9 9m-5-13 9 9M17 46l-5 5m31-32 6-6" fill="none"/><path d="m13 17 15 5-7 6Z"/><path d="m23 25 22 22" fill="none" strokeWidth="3"/></>,
 'mastery-diplomacy':<><path d="M24 20h16l-3 19H27Z" fill="var(--glyph-accent)"/><path d="M25 20c-8 0-9 12-1 12m15-12c8 0 9 12 1 12M32 39v8m-8 1h16M27 15h10" fill="none"/><path d="m18 43-5 5m33-5 5 5" fill="none"/></>,
 'mastery-martial':<><path d="m17 47 23-30 6-4-1 8-23 30Z"/><path d="m17 39 10 8m-4-4-8 10M27 17l-9-5v17l10-5" fill="var(--glyph-accent)"/><path d="M18 12v28" fill="none"/></>,
 'mastery-stewardship':<><path d="M17 17h30v30H17Z" fill="var(--glyph-accent)"/><path d="M21 20v24m11-24v24m11-24v24M17 32h30" fill="none"/><path d="M18 24h6v5h-6Zm11 11h6v5h-6Zm11-13h6v5h-6Z"/><path d="m15 50 34 0" fill="none"/></>,
 'mastery-intrigue':<><path d="M15 23q8-6 17-2 9-4 17 2l-3 16-14 10-14-10Z" fill="var(--glyph-accent)"/><path d="m19 30 9 1-5 5Zm17 1 9-1-4 6Z"/><path d="m32 26-3 12h6m-9 4h12M15 24l-4-6m38 6 4-6" fill="none"/></>,
} as const;
export type CharacterTraitGlyph=keyof typeof characterTraitMotifs;
const illnesses=new Set<CharacterTraitGlyph>(['cold','fever','flux','wasting','injury']);
export function CharacterTraitIcon({name,label,severity=0,paused=false}:{name:CharacterTraitGlyph;label:string;severity?:number;paused?:boolean}){
 const tone=illnesses.has(name)?'illness':name==='buddhist'||name==='campaign-strain'?'modifier':name.startsWith('mastery-')?'mastery':'trait';
 return <span className="trait-badge trait-icon-only character-trait-badge" role="img" aria-label={label} data-tone={tone} data-paused={paused||undefined}>
 <svg className="character-trait-glyph" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
 <circle cx="32" cy="32" r="30" fill="#151e1b"/><circle cx="32" cy="32" r="28.5" fill="var(--glyph-rim)"/><circle cx="32" cy="32" r="26.5" fill="var(--glyph-field)" stroke="#211e17" strokeWidth="1.5"/>
 <path d="M9 25a24 24 0 0 1 36-13M55 39a24 24 0 0 1-36 13" fill="none" stroke="var(--glyph-gold)" strokeWidth=".8" opacity=".7"/>
 <path d="m32 3 2 3-2 3-2-3ZM32 55l2 3-2 3-2-3ZM3 32l3-2 3 2-3 2ZM55 32l3-2 3 2-3 2Z" fill="var(--glyph-gold)"/>
 <g fill="var(--glyph-ivory)" stroke="var(--glyph-line)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{characterTraitMotifs[name]}</g>
 <path d="m12 16 2-2m36 36 2-2m-40-2 2 2m36-36 2 2" stroke="var(--glyph-gold)" strokeWidth="1" opacity=".6"/>
 {severity>=2&&<g fill={severity===3?'#b34837':'#b57c49'} stroke="#f0d7a4" strokeWidth="1.1"><path d="m47 43 11 11-11 7-7-11Z"/>{severity===3?<path d="m46 48 6 6m-7-2 4 4" strokeWidth="2"/>:<path d="m46 50 4 4" strokeWidth="2"/>}</g>}
 {paused&&<g stroke="#e5d4ad" strokeWidth="2.2"><path d="M46 47v10m5-10v10"/></g>}
 </svg></span>;
}
