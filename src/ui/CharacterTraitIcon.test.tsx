import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {CharacterTraitIcon,characterTraitMotifs,type CharacterTraitGlyph} from './CharacterTraitIcon';
import {traitDefinitions} from '../core/personSetupDefinition';
import {illnessNames} from '../core/lifeState';
import {healthProfiles} from '../data/healthProfiles';
import {lifestyleBranches} from '../data/lifestyles';

it('covers every actual personality, disease, health modifier, wound and mastery with a distinct motif',()=>{
 const names=[...Object.keys(traitDefinitions),...Object.keys(illnessNames),...Object.values(healthProfiles).map(p=>p.icon),'injury',...Object.keys(lifestyleBranches).map(b=>'mastery-'+b)];
 expect(names).toHaveLength(20);expect(Object.keys(characterTraitMotifs).sort()).toEqual(names.sort());
 const marks=names.map(name=>renderToStaticMarkup(<svg>{characterTraitMotifs[name as CharacterTraitGlyph]}</svg>));expect(new Set(marks).size).toBe(names.length);
});
it('uses the same medallion, accessible name and SVG sizing for each family',()=>{
 for(const name of Object.keys(characterTraitMotifs) as CharacterTraitGlyph[]){const html=renderToStaticMarkup(<CharacterTraitIcon name={name} label="可访问名称"/>);expect(html).toContain('aria-label="可访问名称"');expect(html).toContain('viewBox="0 0 64 64"');expect(html).toContain('character-trait-badge');expect(html).not.toContain('art-icon');expect(html).not.toContain('<image');}
});
it('reflects severe illness and paused modifiers without fabricating icons for healthy people',()=>{
 const severe=renderToStaticMarkup(<CharacterTraitIcon name="fever" label="热病 · 重症" severity={3}/>),plain=renderToStaticMarkup(<CharacterTraitIcon name="fever" label="热病"/>);
 expect(severe).toContain('data-tone="illness"');expect(severe).toContain('#b34837');expect(plain).not.toContain('#b34837');expect(renderToStaticMarkup(<CharacterTraitIcon name="campaign-strain" label="积劳暂停" paused/>)).toContain('data-paused="true"');
});
