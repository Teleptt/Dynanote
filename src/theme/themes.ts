export type ThemeId = 'obsidian' | 'paper' | 'ocean' | 'forest';
export interface Theme {
  id: ThemeId; name: string; description: string; dark: boolean;
  background: string; surface: string; sidebar: string; border: string; hover: string; active: string;
  text: string; muted: string; accent: string; accentHover: string;
  series: [string, string, string, string, string, string];
}
export const THEMES: Theme[] = [
  { id:'obsidian',name:'Obsidian',description:'Charcoal & violet',dark:true,background:'#18181b',surface:'#202024',sidebar:'#111114',border:'#45454f',hover:'#292930',active:'#35353f',text:'#f3f4f6',muted:'#b0b0bf',accent:'#a78bfa',accentHover:'#c4b5fd',series:['#a78bfa','#38bdf8','#34d399','#fbbf24','#fb7185','#f472b6'] },
  { id:'paper',name:'Paper',description:'Warm white & ink',dark:false,background:'#faf8f3',surface:'#ffffff',sidebar:'#eeeae2',border:'#c9c3b8',hover:'#f0ece4',active:'#e4deef',text:'#252736',muted:'#626273',accent:'#6842b8',accentHover:'#513190',series:['#6842b8','#036b91','#14744b','#925d05','#b32949','#a92a76'] },
  { id:'ocean',name:'Ocean',description:'Deep navy & cyan',dark:true,background:'#0b1725',surface:'#102338',sidebar:'#08121f',border:'#33546c',hover:'#173149',active:'#1d4059',text:'#e8f5ff',muted:'#a0bdcf',accent:'#54d4df',accentHover:'#96eaf0',series:['#54d4df','#79a8ff','#6ee7b7','#ffd078','#ff879b','#d5a2ff'] },
  { id:'forest',name:'Forest',description:'Pine & soft sage',dark:true,background:'#111d18',surface:'#192a22',sidebar:'#0c1611',border:'#3d5a49',hover:'#243b2e',active:'#304b3a',text:'#edf5eb',muted:'#acc3ae',accent:'#a3d68d',accentHover:'#c4e8b4',series:['#a3d68d','#83c5d9','#5fd0a4','#e8c77c','#f29c8d','#c5a5dc'] }
];
export const THEME_STORAGE_KEY = 'dynanote_theme_v1';
export const getTheme = (id: unknown): Theme => THEMES.find(t => t.id === id) || THEMES[0];
let activeTheme = THEMES[0];
const listeners = new Set<() => void>();
export const getActiveTheme = () => activeTheme;
export function subscribeTheme(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function rgb(hex: string): [number, number, number] { return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)) as [number,number,number]; }
export function mix(a: string, b: string, amount: number): string {
  const left=rgb(a), right=rgb(b);
  return '#' + left.map((v,i) => Math.round(v+(right[i]-v)*amount).toString(16).padStart(2,'0')).join('');
}
export function themeVariables(theme: Theme): Record<string,string> {
  const vars: Record<string,string> = {};
  for (const [key,value] of Object.entries(theme)) if (typeof value === 'string' && value.startsWith('#')) vars[`--theme-${key}`]=rgb(value).join(' ');
  const shades = [50,100,200,300,400,500,600,700,800,900,950];
  const neutral = [theme.text,theme.text,mix(theme.text,theme.background,.08),mix(theme.text,theme.background,.15),theme.muted,theme.muted,mix(theme.muted,theme.background,.15),theme.border,theme.active,theme.surface,theme.sidebar];
  shades.forEach((shade,i)=>{ vars[`--neutral-${shade}`]=rgb(neutral[i]).join(' '); });
  // Legacy utility names now refer to semantic palette roles, including opacity variants.
  const families: Record<string,string> = {purple:theme.accent,violet:theme.accent,indigo:theme.series[1],blue:theme.series[1],sky:theme.series[1],cyan:theme.series[1],teal:theme.series[2],emerald:theme.series[2],green:theme.series[2],lime:theme.series[2],yellow:theme.series[3],amber:theme.series[3],orange:theme.series[3],red:theme.series[4],rose:theme.series[4],pink:theme.series[5],fuchsia:theme.series[5]};
  for(const [family,base] of Object.entries(families)) shades.forEach((shade,i)=>{
    const color = i <= 5 ? (i <= 2 ? mix(base,theme.text,.15) : base) : mix(base,theme.background,[0,0,0,0,0,0,theme.dark?.5:0,theme.dark?.6:.2,.65,.86,.93][i]);
    vars[`--${family}-${shade}`]=rgb(color).join(' ');
  });
  return vars;
}
function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme.id;
  document.documentElement.style.colorScheme = theme.dark ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', theme.dark);
  for (const [key,value] of Object.entries(themeVariables(theme))) document.documentElement.style.setProperty(key,value);
}
export function setTheme(id: ThemeId): void {
  activeTheme=getTheme(id); applyTheme(activeTheme);
  try { localStorage.setItem(THEME_STORAGE_KEY, activeTheme.id); } catch { /* In-memory selection still works. */ }
  listeners.forEach(listener=>listener());
}
export function initializeTheme() {
  try { activeTheme=getTheme(localStorage.getItem(THEME_STORAGE_KEY)); } catch { activeTheme=THEMES[0]; }
  applyTheme(activeTheme);
}

/** Map legacy and generated decorative colors into the current theme without editing the spec. */
export function themedColor(input?: string, theme = getActiveTheme()): string {
  if (!input) return theme.accent;
  if (input === 'none' || input === 'transparent' || input.startsWith('url(')) return input;
  const named: Record<string,string> = {white:'#ffffff',black:'#000000',red:'#ef4444',blue:'#3b82f6',green:'#22c55e',purple:'#a855f7',yellow:'#eab308',orange:'#f97316',gray:'#71717a',grey:'#71717a'};
  let value = named[input.toLowerCase()] || input.toLowerCase();
  if (/^#[\da-f]{3}$/.test(value)) value='#'+[...value.slice(1)].map(v=>v+v).join('');
  let opacity = 1;
  if (/^#[\da-f]{8}$/.test(value)) { opacity=parseInt(value.slice(7),16)/255; value=value.slice(0,7); }
  const match=value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if(match) { value='#'+match.slice(1,4).map(v=>Math.min(255,Math.round(Number(v))).toString(16).padStart(2,'0')).join(''); opacity=match[4]===undefined?1:Number(match[4]); }
  if(!/^#[\da-f]{6}$/.test(value)) return theme.accent;
  let result: string;
  if ([theme.background,theme.surface,theme.sidebar,theme.border,theme.hover,theme.active,theme.text,theme.muted,...theme.series].includes(value)) result=value;
  else {
    const sourceTheme = THEMES.find(t => [t.background,t.surface,t.sidebar,t.border,t.hover,t.active,t.text,t.muted,...t.series].includes(value));
    if (sourceTheme) {
      const role = (['background','surface','sidebar','border','hover','active','text','muted'] as const).find(key => sourceTheme[key] === value);
      const mapped = role ? theme[role] : theme.series[sourceTheme.series.indexOf(value)];
      return opacity < 1 ? `rgba(${rgb(mapped).join(', ')}, ${opacity})` : mapped;
    }
    const channels=rgb(value).map(v=>v/255), max=Math.max(...channels), min=Math.min(...channels), delta=max-min;
    const light=(max+min)/2;
    if (light < .15) result=theme.background;
    else if (delta < .13) result=light > .72 ? theme.text : light > .36 ? theme.muted : theme.border;
    else if (light < .25) result=theme.surface;
    else {
      const [r,g,b]=channels;
      const hue=((max===r?(g-b)/delta:max===g?(b-r)/delta+2:(r-g)/delta+4)*60+360)%360;
      result=theme.series[hue<18||hue>=345?4:hue<65?3:hue<170?2:hue<255?1:hue<290?0:5];
    }
  }
  return opacity<1 ? `rgba(${rgb(result).join(', ')}, ${opacity})` : result;
}
export function contrastText(background: string): string {
  const value = /^#[\da-f]{6}$/i.test(background) ? background : '#777777';
  const [r,g,b]=rgb(value).map(v=>v/255);
  return .2126*r+.7152*g+.0722*b > .55 ? '#111827' : '#ffffff';
}
export function themePrompt(theme: Theme): string {
  return `Visual theme: ${theme.name}. Canvas/background ${theme.background}; panels ${theme.surface}; text ${theme.text}; muted labels ${theme.muted}; borders/grid ${theme.border}; accent ${theme.accent}; data series ${theme.series.join(', ')}. Use this palette for decorative colors and readable labels. Preserve scientific color meaning (atom colors, positive/negative states, quantitative colormaps). Do not change equations or model behavior to match a theme.`;
}
