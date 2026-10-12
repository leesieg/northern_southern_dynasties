/** Consume the existing authority-filtered view; an unknown army never gets a fake portrait or count. */
export function armyMarkerAppearance(view:{exact:boolean;strength:string},commander?:string){
 const visibleCommander=view.exact?commander:undefined;
 return {commander:visibleCommander,compact:!visibleCommander,
  strength:view.exact?view.strength:view.strength.startsWith('区域情报 ')?view.strength.replace('区域情报 ','估 '):''};
}
