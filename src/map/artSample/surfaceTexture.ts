/** Approved turf, mineral and triplanar texture fragment. Parameters are world-space. */
export function artSurfaceTexture(atlas:boolean){return `
   vec2 p=soilPoint.xz;float detail=1.-smoothstep(.08,.55,length(fwidth(p)));
   float turf=geoNoise(vec3(p*.85,1.)),mottle=geoNoise(vec3(p*5.5,2.));
   diffuseColor.rgb*=.75+turf*.29+mottle*.24+(grain(floor(p*65.))-.5)*.13*detail;
   float grassPatch=smoothstep(.53,.76,mottle)*detail*(1.-smoothstep(.07,.3,soilSlope));
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.08,1.10,.72),grassPatch*.48);
   float exposure=smoothstep(.05,.25,soilSlope);
   if(exposure>.01){float grainRock=mineral(soilPoint);diffuseColor.rgb*=mix(1.,(.72+grainRock*.52)*mix(1.,fracture(soilPoint),detail*.23),exposure);}
   ${atlas?`vec3 grassTex=swatch(p*.48,vec2(0.,.5));
   vec3 weights=pow(abs(normalize(soilNormal)),vec3(4.));weights/=max(.001,weights.x+weights.y+weights.z);
   vec3 rockTex=swatch(soilPoint.zy*.4,vec2(.5,.5))*weights.x+swatch(p*.4,vec2(.5,.5))*weights.y+swatch(soilPoint.xy*.4,vec2(.5,.5))*weights.z;
   float texDetail=mix(dot(grassTex,vec3(.3,.59,.11))*2.8+.45,dot(rockTex,vec3(.3,.59,.11))*2.0+.30,exposure);
   diffuseColor.rgb*=mix(1.,clamp(texDetail,.52,1.40),.82*(1.-paperBlend));`:''}
`; }
