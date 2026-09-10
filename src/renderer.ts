import type { EffectNodeV2, PointerState } from './types';

const VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const HEADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_source;
uniform sampler2D u_history;
uniform sampler2D u_previousSource;
uniform sampler2D u_motion;
uniform sampler2D u_ascii;
uniform vec2 u_resolution;
uniform vec2 u_motionResolution;
uniform vec2 u_pointer;
uniform float u_pointerActive;
uniform float u_pointerVelocity;
uniform float u_time;
uniform float u_p0;
uniform float u_p1;
uniform float u_p2;
uniform float u_p3;
uniform float u_asciiCount;
uniform float u_seed;
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
`;

const SHADERS: Record<EffectNodeV2['kind'] | 'copy' | 'flipHorizontal' | 'datamoshMotion', string> = {
  copy: `void main(){ outColor = texture(u_source, v_uv); }`,
  flipHorizontal: `void main(){ outColor = texture(u_source, vec2(1. - v_uv.x, v_uv.y)); }`,
  edge: `void main(){
    vec2 px = vec2(max(.5,u_p2)) / u_resolution;
    float tl=lum(texture(u_source,v_uv+px*vec2(-1.,1.)).rgb), tc=lum(texture(u_source,v_uv+px*vec2(0.,1.)).rgb), tr=lum(texture(u_source,v_uv+px).rgb);
    float ml=lum(texture(u_source,v_uv+px*vec2(-1.,0.)).rgb), mr=lum(texture(u_source,v_uv+px*vec2(1.,0.)).rgb);
    float bl=lum(texture(u_source,v_uv-px).rgb), bc=lum(texture(u_source,v_uv+px*vec2(0.,-1.)).rgb), br=lum(texture(u_source,v_uv+px*vec2(1.,-1.)).rgb);
    float gx=-tl-2.*ml-bl+tr+2.*mr+br, gy=-bl-2.*bc-br+tl+2.*tc+tr;
    float e=smoothstep(u_p1,u_p1+.18,length(vec2(gx,gy)));
    if(u_p3>.5)e=1.-e;
    vec4 src=texture(u_source,v_uv); outColor=vec4(mix(src.rgb,vec3(e),u_p0),src.a);
  }`,
  pixelate: `void main(){
    vec2 cell=vec2(u_p0,u_p0/max(.25,u_p2)); vec2 uv=(floor(v_uv*u_resolution/cell)+.5)*cell/u_resolution;
    vec4 src=texture(u_source,v_uv), pix=texture(u_source,uv); float levels=max(2.,floor(u_p3));
    pix.rgb=floor(pix.rgb*levels+.5)/levels; outColor=mix(src,pix,u_p1);
  }`,
  dither: `float bayer(vec2 p){
    vec2 q=mod(floor(p),4.); float x=q.x,y=q.y;
    return (mod(x,2.)*2.+mod(y,2.)+mod(floor(x/2.),2.)*.5+mod(floor(y/2.),2.)*.25)/4.;
  } void main(){
    vec3 c=texture(u_source,v_uv).rgb; c=mix(c,vec3(lum(c)),u_p3); float n=(bayer(gl_FragCoord.xy/max(1.,u_p0))-.5)*u_p2;
    float levels=max(2.,floor(u_p1)); c=floor(clamp(c+n/levels,0.,1.)*levels+.5)/levels; outColor=vec4(c,1.);
  }`,
  halftone: `void main(){
    float a=u_p1; mat2 r=mat2(cos(a),-sin(a),sin(a),cos(a)); vec2 p=r*((v_uv-.5)*u_resolution);
    vec2 cell=floor(p/u_p0)*u_p0+u_p0*.5; vec2 sampleUv=(inverse(r)*cell)/u_resolution+.5;
    vec3 c=texture(u_source,clamp(sampleUv,0.,1.)).rgb; float l=lum(c); float radius=u_p0*.5*sqrt(max(0.,1.-l))*u_p2;
    float dotMask=1.-smoothstep(radius-1.,radius+1.,length(p-cell)); vec3 ink=mix(vec3(0.),c,u_p3);
    outColor=vec4(mix(vec3(1.),ink,dotMask),1.);
  }`,
  ascii: `void main(){
    vec2 cell=vec2(max(7.,u_p0),max(7.,u_p0)*1.35); vec2 grid=v_uv*u_resolution/cell; vec2 id=floor(grid); vec2 local=fract(grid);
    vec2 center=(id+.5)*cell/u_resolution; vec3 src=texture(u_source,center).rgb; float l=clamp((lum(src)-.5)*u_p1+.5,0.,1.);
    float count=max(1.,u_asciiCount); float idx=floor((1.-l)*(count-1.)+.5); vec2 atlasUv=vec2((idx+local.x)/count,local.y);
    float glyph=texture(u_ascii,atlasUv).r; vec3 ink=mix(vec3(.92),src,u_p2); vec3 bg=src*u_p3;
    outColor=vec4(mix(bg,ink,glyph),1.);
  }`,
  glitch: `void main(){
    float block=max(4.,u_p2); vec2 id=floor(gl_FragCoord.xy/block); float gate=step(1.-u_p0*.32,hash21(vec2(id.y,floor(u_time*9.))));
    float shift=(hash21(id+floor(u_time*7.))-.5)*u_p0*.32*gate; vec2 uv=v_uv+vec2(shift,0.);
    vec2 split=vec2(u_p1/u_resolution.x,0.); vec3 c=vec3(texture(u_source,uv+split).r,texture(u_source,uv).g,texture(u_source,uv-split).b);
    c*=1.-u_p3*(.12+.1*sin(gl_FragCoord.y*3.14159)); outColor=vec4(c,1.);
  }`,
  pixelSort: `void main(){
    const int MAX_SPAN=16; vec4 colors[MAX_SPAN]; float keys[MAX_SPAN]; float eligible[MAX_SPAN];
    int limit=int(clamp(floor(u_p1+.5),8.,16.)); int mode=int(clamp(floor(u_p2+.5),0.,3.));
    bool vertical=(mode==1||mode==3); bool reverse=(mode>=2); float axisSize=vertical?u_resolution.y:u_resolution.x;
    float coordinate=vertical?gl_FragCoord.y:gl_FragCoord.x; float line=vertical?floor(gl_FragCoord.x):floor(gl_FragCoord.y);
    float randomOffset=floor(hash21(vec2(line,u_seed+17.))*float(limit));
    float chunkStart=floor((coordinate+randomOffset)/float(limit))*float(limit)-randomOffset;
    int position=int(clamp(floor(coordinate-chunkStart),0.,float(limit-1))); float low=min(u_p0,u_p3),high=max(u_p0,u_p3);
    for(int i=0;i<MAX_SPAN;i++){
      float sampleCoordinate=chunkStart+float(i)+.5; vec2 uv=v_uv;
      if(vertical)uv.y=sampleCoordinate/u_resolution.y;else uv.x=sampleCoordinate/u_resolution.x;
      colors[i]=texture(u_source,clamp(uv,0.,1.)); float key=lum(colors[i].rgb); keys[i]=key;
      eligible[i]=(i<limit&&sampleCoordinate>=0.&&sampleCoordinate<axisSize&&key>=low&&key<=high)?1.:0.;
    }
    if(eligible[position]<.5){outColor=texture(u_source,v_uv);return;}
    int runStart=0,runEnd=limit;
    for(int i=0;i<MAX_SPAN;i++){
      if(i<position&&eligible[i]<.5)runStart=i+1;
      if(i>position&&i<runEnd&&eligible[i]<.5)runEnd=i;
    }
    for(int i=0;i<MAX_SPAN;i++)if(i<runStart||i>=runEnd)keys[i]=2.+float(i)/float(MAX_SPAN);
    for(int k=2;k<=MAX_SPAN;k*=2){
      for(int j=k/2;j>0;j/=2){
        for(int i=0;i<MAX_SPAN;i++){
          int partner=i^j;
          if(partner>i){
            bool ascending=(i&k)==0; bool swapValues=ascending?(keys[i]>keys[partner]):(keys[i]<keys[partner]);
            if(swapValues){float key=keys[i];keys[i]=keys[partner];keys[partner]=key;vec4 color=colors[i];colors[i]=colors[partner];colors[partner]=color;}
          }
        }
      }
    }
    int rank=position-runStart; int runLength=runEnd-runStart; if(reverse)rank=runLength-1-rank;
    outColor=colors[clamp(rank,0,MAX_SPAN-1)];
  }`,
  echo: `void main(){
    vec2 drift=vec2(u_p1,u_p2)/u_resolution; vec4 src=texture(u_source,v_uv); vec4 old=texture(u_history,clamp(v_uv-drift,0.,1.));
    old.rgb=mix(old.rgb,old.brg,u_p3); outColor=vec4(mix(src.rgb,old.rgb,u_p0),1.);
  }`,
  slitScan: `void main(){
    float coord=u_p2<.5?v_uv.x:v_uv.y; float line=fract(u_time*u_p1); float dist=abs(coord-line); dist=min(dist,1.-dist);
    float write=1.-smoothstep(u_p0,u_p0+u_p3,dist); vec4 now=texture(u_source,v_uv), old=texture(u_history,v_uv);
    outColor=mix(old,now,write);
  }`,
  bloom: `void main(){
    vec2 r=vec2(max(.5,u_p2))/u_resolution; vec3 glow=vec3(0.); float weight=0.;
    for(int x=-2;x<=2;x++){for(int y=-2;y<=2;y++){float w=1./(1.+float(x*x+y*y));vec3 c=texture(u_source,v_uv+vec2(x,y)*r).rgb;glow+=c*step(u_p1,lum(c))*w;weight+=w;}}
    vec3 src=texture(u_source,v_uv).rgb; glow/=weight; glow=mix(glow,glow*vec3(.65,.9,1.2),u_p3); outColor=vec4(src+glow*u_p0,1.);
  }`,
  flow: `void main(){
    vec2 d=v_uv-u_pointer; d.x*=u_resolution.x/u_resolution.y; float radius=max(.01,u_p0); float influence=exp(-dot(d,d)/(radius*radius));
    float force=u_p1*(.25+u_pointerActive+.15*u_pointerVelocity); float angle=u_p2*influence+sin(u_time*3.)*u_p3;
    mat2 rot=mat2(cos(angle),-sin(angle),sin(angle),cos(angle)); vec2 warped=u_pointer+rot*(v_uv-u_pointer)*(1.-force*influence);
    outColor=texture(u_source,clamp(warped,0.,1.));
  }`,
  jumpFlood: `void main(){
    vec2 cells=vec2(max(3.,u_p0)); vec2 p=v_uv*cells; vec2 id=floor(p); vec2 f=fract(p); float best=9.; vec2 bestId=id;
    for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){vec2 n=vec2(x,y);vec2 seed=n+vec2(hash21(id+n),hash21(id+n+31.7));float d=length(f-seed);if(d<best){best=d;bestId=id+n;}}}
    vec2 seedUv=(bestId+vec2(hash21(bestId),hash21(bestId+31.7)))/cells; vec3 src=texture(u_source,v_uv).rgb; vec3 pulled=texture(u_source,clamp(mix(v_uv,seedUv,u_p1),0.,1.)).rgb;
    float contour=.5+.5*cos(best*6.28318*u_p2); vec3 field=pulled*(.68+.32*contour); outColor=vec4(mix(src,field,u_p3),1.);
  }`,
  seamMelt: `void main(){
    vec2 px=vec2(1.)/u_resolution; float l=lum(texture(u_source,v_uv-px).rgb),r=lum(texture(u_source,v_uv+px).rgb);
    float energy=abs(r-l)*u_p1; float seam=sin(v_uv.y*28.+u_time*(.4+u_p2*2.))*u_p2*.04;
    float center=.5+seam+(energy-.15)*.15; float x=v_uv.x; float compressed=mix(x,center+(x-center)/(1.-u_p0),u_p0);
    vec4 src=texture(u_source,v_uv), melt=texture(u_source,vec2(clamp(compressed,0.,1.),v_uv.y)); outColor=mix(src,melt,u_p3);
  }`,
  monochrome: `void main(){
    vec4 src=texture(u_source,v_uv); float l=clamp((lum(src.rgb)-.5)*u_p0+.5+u_p1,0.,1.);
    vec3 mono=mix(vec3(l),vec3(l*.78,l*.94,l),u_p2); outColor=vec4(mix(src.rgb,mono,u_p3),src.a);
  }`,
  posterize: `void main(){
    vec4 src=texture(u_source,v_uv); float levels=max(2.,floor(u_p0)); vec3 c=pow(max(src.rgb,vec3(0.)),vec3(max(.05,u_p2)));
    float l=lum(c); c=mix(vec3(l),c,u_p1); c=floor(clamp(c,0.,1.)*levels+.5)/levels; outColor=vec4(mix(src.rgb,c,u_p3),src.a);
  }`,
  solarize: `vec3 hue(vec3 c,float a){float s=sin(a),co=cos(a);mat3 m=mat3(.299+.701*co+.168*s,.587-.587*co+.330*s,.114-.114*co-.497*s,.299-.299*co-.328*s,.587+.413*co+.035*s,.114-.114*co+.292*s,.299-.3*co+1.25*s,.587-.588*co-1.05*s,.114+.886*co-.203*s);return clamp(m*c,0.,1.);} void main(){
    vec4 src=texture(u_source,v_uv); float l=lum(src.rgb); float flip=smoothstep(u_p0-u_p1,u_p0+u_p1,l); vec3 sol=mix(src.rgb,1.-src.rgb,flip);
    sol=hue(sol,u_p2*3.14159); outColor=vec4(mix(src.rgb,sol,u_p3),src.a);
  }`,
  thermal: `vec3 heat(float t){
    return clamp(vec3(1.5-abs(4.*t-3.),1.5-abs(4.*t-2.),1.5-abs(4.*t-1.)),0.,1.);
  } void main(){
    vec3 src=texture(u_source,v_uv).rgb; float v=clamp(lum(src)*u_p0+u_p2*.35,0.,1.); if(u_p1>1.)v=floor(v*u_p1)/u_p1;
    outColor=vec4(mix(src,heat(v),u_p3),1.);
  }`,
  chroma: `void main(){
    vec2 dir=vec2(cos(u_p1),sin(u_p1)); vec2 radial=(v_uv-.5)*2.; vec2 offset=mix(dir,radial,u_p2)*u_p0/u_resolution;
    vec3 shifted=vec3(texture(u_source,clamp(v_uv+offset,0.,1.)).r,texture(u_source,v_uv).g,texture(u_source,clamp(v_uv-offset,0.,1.)).b);
    vec3 src=texture(u_source,v_uv).rgb; outColor=vec4(mix(src,shifted,u_p3),1.);
  }`,
  kaleidoscope: `void main(){
    vec2 p=(v_uv-.5)*u_p2; p.x*=u_resolution.x/u_resolution.y; float radius=length(p); float sectors=max(2.,floor(u_p0)); float sector=6.283185/sectors;
    float angle=atan(p.y,p.x)+u_p1+u_time*u_p3; angle=abs(mod(angle+sector*.5,sector)-sector*.5); vec2 q=vec2(cos(angle),sin(angle))*radius;
    q.x/=u_resolution.x/u_resolution.y; outColor=texture(u_source,fract(q+.5));
  }`,
  mirror: `void main(){
    vec2 uv=v_uv; float c=u_p1<.5?uv.x:uv.y; float mirrored=u_p2<.5?u_p0-abs(c-u_p0):u_p0+abs(c-u_p0); if(u_p1<.5)uv.x=mirrored;else uv.y=mirrored;
    vec4 src=texture(u_source,v_uv), reflected=texture(u_source,clamp(uv,0.,1.)); outColor=mix(src,reflected,u_p3);
  }`,
  ripple: `void main(){
    vec2 center=u_pointerActive>.5?u_pointer:vec2(.5); vec2 d=v_uv-center; d.x*=u_resolution.x/u_resolution.y; float r=length(d); float envelope=smoothstep(u_p3,0.,r);
    vec2 uv=v_uv+normalize(d+1e-5)*sin(r*u_p1-u_time*u_p2)*u_p0*envelope; outColor=texture(u_source,clamp(uv,0.,1.));
  }`,
  fisheye: `void main(){
    vec2 p=(v_uv-.5)*2.; p.x*=u_resolution.x/u_resolution.y; float r2=dot(p,p); vec2 warped=p*(1.+u_p0*r2)/max(.2,u_p1); warped.x/=u_resolution.x/u_resolution.y;
    vec2 uv=warped*.5+.5; vec3 src=texture(u_source,v_uv).rgb, fish=texture(u_source,clamp(uv,0.,1.)).rgb; float vignette=1.-smoothstep(.2,1.4,length(p))*u_p2;
    outColor=vec4(mix(src,fish*vignette,u_p3),1.);
  }`,
  crt: `void main(){
    vec2 p=v_uv*2.-1.; vec2 bend=p*(1.+u_p0*vec2(p.y*p.y,p.x*p.x)); vec2 uv=bend*.5+.5; vec3 c=texture(u_source,clamp(uv,0.,1.)).rgb;
    float scan=1.-u_p1*(.15+.15*sin(gl_FragCoord.y*3.14159)); vec3 grille=vec3(.9+u_p2*.1*sin(gl_FragCoord.x*2.094),.9+u_p2*.1*sin(gl_FragCoord.x*2.094+2.094),.9+u_p2*.1*sin(gl_FragCoord.x*2.094+4.188));
    float vig=pow(clamp(1.-dot(p,p)*.35,0.,1.),1.+u_p3*2.); float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.); outColor=vec4(c*scan*grille*mix(1.,vig,u_p3)*inside,1.);
  }`,
  noise: `void main(){
    vec3 src=texture(u_source,v_uv).rgb; vec2 cell=floor(gl_FragCoord.xy/max(1.,u_p1)); float tick=floor(u_time*max(.1,u_p3));
    float a=hash21(cell+tick),b=hash21(cell+tick+19.2),c=hash21(cell+tick+71.9); vec3 grain=mix(vec3(a),vec3(a,b,c),u_p2)-.5;
    outColor=vec4(clamp(src+grain*u_p0,0.,1.),1.);
  }`,
  datamoshMotion: `void main(){
    float block=max(4.,u_p1),search=max(0.,u_p2); vec2 id=floor(gl_FragCoord.xy); vec2 anchor=(id+.5)*block/u_resolution;
    vec2 tap=block*.22/u_resolution; vec3 currentCenter=texture(u_source,clamp(anchor,0.,1.)).rgb;
    float bestError=1e6; vec2 bestOffset=vec2(0.);
    for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){
      vec2 candidate=vec2(float(x),float(y))*search/u_resolution; float error=0.;
      error+=length(currentCenter-texture(u_previousSource,clamp(anchor+candidate,0.,1.)).rgb);
      error+=length(texture(u_source,clamp(anchor+tap,0.,1.)).rgb-texture(u_previousSource,clamp(anchor+tap+candidate,0.,1.)).rgb);
      error+=length(texture(u_source,clamp(anchor-tap,0.,1.)).rgb-texture(u_previousSource,clamp(anchor-tap+candidate,0.,1.)).rgb);
      if(error<bestError){bestError=error;bestOffset=candidate;}
    }}
    float sourceChange=length(currentCenter-texture(u_previousSource,clamp(anchor,0.,1.)).rgb);
    float confidence=1.-smoothstep(.18,1.35,bestError); vec2 encoded=bestOffset*u_resolution/max(1.,search)*.5+.5;
    outColor=vec4(encoded,confidence,clamp(sourceChange,0.,1.));
  }`,
  datamosh: `void main(){
    float block=max(4.,u_p1),search=max(0.,u_p2); vec2 id=floor(gl_FragCoord.xy/block); vec2 motionUv=(id+.5)/u_motionResolution;
    vec4 motionData=texture(u_motion,clamp(motionUv,0.,1.)); vec2 bestOffset=(motionData.rg*2.-1.)*search/u_resolution;
    vec3 now=texture(u_source,v_uv).rgb; vec3 recycled=texture(u_history,clamp(v_uv+bestOffset,0.,1.)).rgb;
    float motionAmount=length(bestOffset*u_resolution)/max(1.,search*1.4142); float confidence=motionData.b,sourceChange=motionData.a;
    float tick=floor(u_time*2.5); float dropped=step(1.-u_p0,hash21(id+tick+u_seed));
    float activity=max(smoothstep(.015,.3,sourceChange),motionAmount*confidence); float hold=dropped*u_p3*mix(.3,1.,activity);
    float chromaError=(1.-confidence)*u_p0*.18; recycled=mix(recycled,recycled.gbr,chromaError);
    outColor=vec4(mix(now,recycled,hold),1.);
  }`,
  lowpoly: `void main(){
    float size=max(4.,u_p0); vec2 p=gl_FragCoord.xy/size; vec2 id=floor(p); vec2 f=fract(p); bool upper=f.x+f.y>1.;
    vec2 center=(id+(upper?vec2(.666):vec2(.333)))*size/u_resolution; vec2 jitter=vec2(hash21(id)-.5,hash21(id+33.3)-.5)*size/u_resolution*u_p1;
    vec3 facet=texture(u_source,clamp(center+jitter,0.,1.)).rgb; float shade=(upper?.5:-.5)*u_p2; facet*=1.+shade; vec3 src=texture(u_source,v_uv).rgb;
    outColor=vec4(mix(src,facet,u_p3),1.);
  }`,
  cubism: `void main(){
    float size=max(8.,u_p0); vec2 pixel=v_uv*u_resolution; vec2 id=floor(pixel/size); vec2 center=(id+.5)*size; vec2 local=pixel-center;
    float angle=(hash21(id)-.5)*u_p1*2.; mat2 rot=mat2(cos(angle),-sin(angle),sin(angle),cos(angle)); vec2 displaced=(hash21(id+8.1)-.5)*u_p2*size*vec2(1.,-1.);
    vec2 uv=(center+rot*local+displaced)/u_resolution; vec3 src=texture(u_source,v_uv).rgb, block=texture(u_source,clamp(uv,0.,1.)).rgb; outColor=vec4(mix(src,block,u_p3),1.);
  }`,
  doodle: `void main(){
    vec2 wobble=vec2(hash21(floor(gl_FragCoord.xy/12.)+floor(u_time*4.))-.5)*u_p2*u_p1/u_resolution; vec2 px=max(.5,u_p1)/u_resolution;
    float l=lum(texture(u_source,v_uv+wobble-px).rgb),r=lum(texture(u_source,v_uv+wobble+px).rgb),t=lum(texture(u_source,v_uv+wobble+vec2(px.x,-px.y)).rgb),b=lum(texture(u_source,v_uv+wobble+vec2(-px.x,px.y)).rgb);
    float edge=smoothstep(u_p0,u_p0+.12,length(vec2(r-l,b-t))); vec3 src=texture(u_source,v_uv).rgb; vec3 paper=vec3(.92,.9,.84); vec3 ink=mix(vec3(.04),src,u_p3);
    outColor=vec4(mix(paper,ink,edge),1.);
  }`,
  prism: `void main(){
    vec2 p=v_uv-.5; p.x*=u_resolution.x/u_resolution.y; float facets=max(3.,floor(u_p0)); float sector=6.283185/facets; float angle=atan(p.y,p.x)+u_p2;
    float folded=abs(mod(angle+sector*.5,sector)-sector*.5); float radius=length(p); vec2 q=vec2(cos(folded),sin(folded))*radius; q.x/=u_resolution.x/u_resolution.y; q+=.5;
    vec2 split=normalize(p+1e-5)*u_p1/u_resolution; vec3 prism=vec3(texture(u_source,clamp(q+split,0.,1.)).r,texture(u_source,clamp(q,0.,1.)).g,texture(u_source,clamp(q-split,0.,1.)).b);
    vec3 src=texture(u_source,v_uv).rgb; outColor=vec4(mix(src,prism,u_p3),1.);
  }`,
  measure: `void main(){
    vec3 src=texture(u_source,v_uv).rgb; float l=clamp((lum(src)*u_p0-.5)*u_p1+.5+u_p2,0.,1.);
    vec3 measured=mix(vec3(l),normalize(src+.001)*l*1.4,u_p3); outColor=vec4(measured,1.);
  }`,
  difference: `void main(){
    vec3 src=texture(u_source,v_uv).rgb, old=texture(u_history,v_uv).rgb; vec3 d=abs(src-old)*u_p0;
    float gate=smoothstep(u_p1,u_p1+.08,lum(d)); vec3 signal=mix(d,old,u_p2*.25)*gate; outColor=vec4(mix(src,signal,u_p3),1.);
  }`,
  fold: `void main(){
    vec2 p=(v_uv-.5)*u_p1; p.x*=u_resolution.x/u_resolution.y; float a=u_p2+u_time*u_p3;
    mat2 r=mat2(cos(a),-sin(a),sin(a),cos(a)); p=r*p; float n=max(1.,floor(u_p0));
    for(int i=0;i<12;i++){if(float(i)>=n)break;p=abs(p)-vec2(.25+.025*float(i));p*=1.08;}
    p.x/=u_resolution.x/u_resolution.y; outColor=texture(u_source,fract(p+.5));
  }`,
  divide: `void main(){
    float depth=max(1.,floor(u_p0)); float cells=exp2(depth); vec2 p=v_uv*cells; vec2 id=floor(p); vec2 f=fract(p);
    float jitter=(hash21(id+floor(u_time*.35))-.5)*u_p1; vec2 sampleUv=(id+.5+vec2(jitter,-jitter))/cells;
    vec3 block=texture(u_source,clamp(sampleUv,0.,1.)).rgb; vec2 px=1./u_resolution;
    float edge=length(texture(u_source,v_uv+px).rgb-texture(u_source,v_uv-px).rgb);
    float fine=mix(1.,.5,step(u_p2,edge)); vec2 fineUv=(floor(v_uv*cells/fine)+.5)*fine/cells;
    block=mix(block,texture(u_source,clamp(fineUv,0.,1.)).rgb,step(u_p2,edge));
    float line=step(min(min(f.x,f.y),min(1.-f.x,1.-f.y)),.025+u_p3*.04); outColor=vec4(mix(block,vec3(1.-lum(block)),line*u_p3),1.);
  }`,
  cells: `void main(){
    float density=max(3.,u_p0); vec2 p=v_uv*density; vec2 id=floor(p), f=fract(p); float best=9., second=9.; vec2 bestId=id;
    for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){vec2 n=vec2(x,y);vec2 h=vec2(hash21(id+n+u_seed),hash21(id+n+31.7+u_seed));vec2 seed=n+mix(vec2(.5),h,u_p1);seed+=sin(u_time*u_p2+6.283*h)*.12;float d=length(f-seed);if(d<best){second=best;best=d;bestId=id+n;}else if(d<second){second=d;}}}
    vec2 uv=(bestId+.5)/density; vec3 c=texture(u_source,clamp(uv,0.,1.)).rgb; float border=1.-smoothstep(0.,.035+u_p3*.08,second-best); outColor=vec4(mix(c,vec3(1.-lum(c)),border*u_p3),1.);
  }`,
  gate: `void main(){
    vec3 src=texture(u_source,v_uv).rgb; float mask=smoothstep(u_p0-u_p1,u_p0+u_p1,lum(src)); if(u_p2>.5)mask=1.-mask;
    outColor=vec4(mix(vec3(mask),src,u_p3),1.);
  }`,
  soften: `void main(){
    vec2 px=max(.5,u_p0)/u_resolution; vec3 sum=vec3(0.); float weight=0.;
    for(int x=-2;x<=2;x++){for(int y=-2;y<=2;y++){float w=1./(1.+float(x*x+y*y));sum+=texture(u_source,v_uv+vec2(x,y)*px).rgb*w;weight+=w;}}
    vec3 src=texture(u_source,v_uv).rgb, blur=sum/weight; blur=mix(blur,src,smoothstep(.05,.5,length(src-blur))*u_p2); outColor=vec4(mix(src,blur,u_p3),1.);
  }`,
  displace: `void main(){
    float t=u_time*u_p2+u_seed*.001; vec2 field=vec2(sin(v_uv.y*u_p1+t)+cos(v_uv.x*u_p1*.7-t),cos(v_uv.x*u_p1-t)+sin(v_uv.y*u_p1*.8+t));
    vec2 d=v_uv-u_pointer; float touch=u_pointerActive*u_p3*exp(-dot(d,d)/.035); field+=normalize(d+1e-5)*touch*4.;
    outColor=texture(u_source,clamp(v_uv+field*u_p0,0.,1.));
  }`,
  palette: `vec3 pal(float t,float scheme){
    vec3 a=vec3(.5),b=vec3(.5),c=vec3(1.);vec3 d=scheme<.5?vec3(0.):scheme<1.5?vec3(.0,.33,.67):scheme<2.5?vec3(.5,.2,.25):scheme<3.5?vec3(.8,.9,.3):scheme<4.5?vec3(.0,.1,.2):vec3(.6,.2,.0);
    return a+b*cos(6.28318*(c*t+d));
  } void main(){vec3 src=texture(u_source,v_uv).rgb;float l=clamp((lum(src)-.5)*u_p1+.5+u_p2*.25,0.,1.);outColor=vec4(mix(src,pal(l,floor(u_p0)),u_p3),1.);}`,
  quantize: `void main(){
    float size=max(1.,u_p0); vec2 jitter=(vec2(hash21(floor(gl_FragCoord.xy/size)+u_seed),hash21(floor(gl_FragCoord.yx/size)+u_seed+9.))- .5)*u_p2;
    vec2 uv=(floor(v_uv*u_resolution/size)+.5+jitter)*size/u_resolution; vec3 src=texture(u_source,v_uv).rgb,c=texture(u_source,clamp(uv,0.,1.)).rgb;float levels=max(2.,floor(u_p1));c=floor(c*levels+.5)/levels;outColor=vec4(mix(src,c,u_p3),1.);
  }`,
  contour: `void main(){
    vec3 src=texture(u_source,v_uv).rgb;float bands=max(2.,u_p0);float v=fract(lum(src)*bands+u_time*u_p2);float line=1.-smoothstep(u_p1,min(.5,u_p1+.08),abs(v-.5));
    outColor=vec4(mix(vec3(line),src,u_p3),1.);
  }`,
  path: `void main(){
    float cells=exp2(max(2.,floor(u_p0)));vec2 p=fract(v_uv*cells);vec2 id=floor(v_uv*cells);float parity=mod(id.x+id.y,2.);float line=min(abs(p.y-.5),abs(p.x-.5));
    float connector=abs((parity<.5?p.x:p.y)-.5);float mask=1.-smoothstep(u_p1,u_p1+.04,min(line,connector));float travel=.35+.65*sin((id.x+id.y*cells)/cells*6.283+u_time*u_p2);
    vec3 src=texture(u_source,v_uv).rgb;vec3 circuit=src*(.35+.65*travel)*mask;outColor=vec4(mix(circuit,src,u_p3),1.);
  }`,
  melt: `void main(){
    float field=0.;vec2 grad=vec2(0.);float count=max(2.,floor(u_p0));
    for(int i=0;i<14;i++){if(float(i)>=count)break;float fi=float(i);vec2 c=vec2(hash21(vec2(fi,u_seed)),hash21(vec2(fi+19.,u_seed)));c+=sin(vec2(1.3,1.7)*u_time*u_p2+fi)*.12;vec2 d=v_uv-c;float inv=1./(.008+dot(d,d));field+=inv;grad+=d*inv*inv;}
    vec2 touch=v_uv-u_pointer;grad+=normalize(touch+1e-5)*u_pointerActive*u_p1*40.;vec2 uv=v_uv-normalize(grad+1e-5)*u_p3*smoothstep(20.,120.,field);vec3 c=texture(u_source,clamp(uv,0.,1.)).rgb;c*=.7+.3*smoothstep(12.,70.,field);outColor=vec4(c,1.);
  }`,
  culture: `void main(){
    vec2 px=1./u_resolution;float c=lum(texture(u_history,v_uv).rgb);float lap=lum(texture(u_history,v_uv+vec2(px.x,0.)).rgb)+lum(texture(u_history,v_uv-vec2(px.x,0.)).rgb)+lum(texture(u_history,v_uv+vec2(0.,px.y)).rgb)+lum(texture(u_history,v_uv-vec2(0.,px.y)).rgb)-4.*c;
    float camera=lum(texture(u_source,v_uv).rgb);float reaction=c+(lap*u_p2+(camera-c)*u_p0*.08-(c-.5)*u_p1*.025);reaction=mix(reaction,camera,u_p3*.025);vec3 col=.5+.5*cos(6.283*(reaction+vec3(0.,.18,.36)));outColor=vec4(col,1.);
  }`,
  life: `void main(){
    float size=max(2.,u_p0);vec2 px=size/u_resolution;vec2 uv=(floor(v_uv*u_resolution/size)+.5)*size/u_resolution;float alive=step(.5,lum(texture(u_history,uv).rgb));float n=0.;
    for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){if(x!=0||y!=0)n+=step(.5,lum(texture(u_history,uv+vec2(x,y)*px).rgb));}}
    float next=alive*step(abs(n-u_p2),.45)+(1.-alive)*step(abs(n-u_p1),.45);float seedCamera=step(.72,lum(texture(u_source,uv).rgb))*u_p3;next=max(next,seedCamera);outColor=vec4(vec3(next),1.);
  }`,
  grain: `void main(){
    float size=max(2.,u_p2);vec2 uv=(floor(v_uv*u_resolution/size)+.5)*size/u_resolution;vec2 down=vec2(0.,-sign(u_p0)*size/u_resolution.y);vec3 old=texture(u_history,clamp(uv-down,0.,1.)).rgb;vec3 src=texture(u_source,uv).rgb;float seedStep=step(1.-u_p3,lum(src));float scatter=(hash21(floor(uv*u_resolution/size)+floor(u_time*12.)+u_seed)-.5)*(1.-u_p1)*size/u_resolution.x;vec3 falling=texture(u_history,clamp(uv-down+vec2(scatter,0.),0.,1.)).rgb;outColor=vec4(max(mix(old,falling,.7),src*seedStep),1.);
  }`,
  trails: `void main(){
    vec3 old=texture(u_history,v_uv).rgb*u_p2;vec3 src=texture(u_source,v_uv).rgb;float marks=0.;float count=max(4.,floor(u_p0));
    for(int i=0;i<64;i++){if(float(i)>=count)break;float fi=float(i);vec2 origin=vec2(hash21(vec2(fi,u_seed)),hash21(vec2(fi+41.,u_seed)));vec2 p=fract(origin+vec2(cos(fi*2.4+u_time),sin(fi*1.7+u_time*1.2))*u_time*.008*(.2+u_p1));float d=length(v_uv-p);marks+=smoothstep(.012,.0,d);}
    float pull=lum(src)*u_p3;vec3 ink=vec3(marks*(.4+pull),marks*.8,marks);outColor=vec4(max(old,ink),1.);
  }`,
  assembly: `void main(){
    float cells=max(4.,u_p0);vec2 grid=v_uv*cells;vec2 id=floor(grid),f=fract(grid);vec2 center=vec2(.5);vec2 origin=(id+.5)/cells;vec2 drift=vec2(sin(u_time*u_p3+id.y),cos(u_time*u_p3*.8+id.x))*.18;vec2 touch=origin-u_pointer;float disturb=u_pointerActive*u_p2*exp(-dot(touch,touch)/.04);center+=drift+normalize(touch+1e-5)*disturb;
    float particle=1.-smoothstep(u_p1*.45,u_p1*.45+.08,length(f-center));vec3 sampledColor=texture(u_source,origin).rgb;outColor=vec4(sampledColor*particle,1.);
  }`,
};

type SourceElement = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
type HistoryBuffer = {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  sourceTexture: WebGLTexture;
  sourceFramebuffer: WebGLFramebuffer;
  motionTexture: WebGLTexture;
  motionFramebuffer: WebGLFramebuffer;
  motionWidth: number;
  motionHeight: number;
  ready: boolean;
  sourceReady: boolean;
};
const TEMPORAL_KINDS = new Set<EffectNodeV2['kind']>(['echo', 'slitScan', 'datamosh', 'difference', 'culture', 'life', 'grain', 'trails']);

export class WebGLRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly programs = new Map<string, WebGLProgram>();
  private readonly sourceTexture: WebGLTexture;
  private readonly pingTextures: WebGLTexture[];
  private readonly framebuffers: WebGLFramebuffer[];
  private readonly asciiTexture: WebGLTexture;
  private readonly histories = new Map<string, HistoryBuffer>();
  private asciiCharset = '';
  private width = 2;
  private height = 2;
  private qualityScale = 1;
  private contextLost = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 is not available on this device.');
    this.gl = gl;
    const position = gl.createBuffer();
    if (!position) throw new Error('Could not create the GPU vertex buffer.');
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    this.sourceTexture = this.createTexture();
    this.pingTextures = [this.createTexture(), this.createTexture()];
    this.framebuffers = this.pingTextures.map((texture) => {
      const framebuffer = gl.createFramebuffer();
      if (!framebuffer) throw new Error('Could not create a GPU framebuffer.');
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      return framebuffer;
    });
    this.asciiTexture = this.createTexture();
    this.updateAscii(' .:-=+*#%@');
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); this.contextLost = true; });
    canvas.addEventListener('webglcontextrestored', () => location.reload());
  }

  get backendName(): string { return 'WebGL2 Core'; }

  setQualityScale(scale: number): void { this.qualityScale = Math.max(.5, Math.min(1, scale)); }

  resetHistory(): void { this.histories.forEach((history) => { history.ready = false; history.sourceReady = false; }); }

  render(source: SourceElement, effects: readonly EffectNodeV2[], pointer: PointerState, time: number, mirrorSource = false): void {
    if (this.contextLost) return;
    this.resize();
    const gl = this.gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    } catch {
      return;
    }

    const active = effects.filter((effect) => effect.enabled);
    this.pruneHistories(new Set(effects.map((effect) => effect.id)));
    let input = this.sourceTexture;
    let passIndex = 0;
    if (mirrorSource) {
      this.draw('flipHorizontal', input, this.framebuffers[0], null, pointer, time);
      input = this.pingTextures[0];
      passIndex = 1;
    }
    active.forEach((effect) => {
      if (effect.kind === 'ascii' && effect.parameters.charset) this.updateAscii(effect.parameters.charset);
      const targetIndex = passIndex % 2;
      const history = TEMPORAL_KINDS.has(effect.kind) ? this.historyFor(effect.id) : undefined;
      const effectInput = input;
      if (effect.kind === 'datamosh' && history) this.prepareDatamoshMotion(effectInput, effect, pointer, time, history);
      this.draw(effect.kind, input, this.framebuffers[targetIndex], effect, pointer, time, history);
      input = this.pingTextures[targetIndex];
      passIndex += 1;
      if (history) {
        this.draw('copy', input, history.framebuffer, null, pointer, time);
        this.draw('copy', effectInput, history.sourceFramebuffer, null, pointer, time);
        history.ready = true;
        history.sourceReady = true;
      }
    });
    this.draw('copy', input, null, null, pointer, time);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  snapshot(type = 'image/png', quality = .95): Promise<Blob> {
    return new Promise((resolve, reject) => this.canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Snapshot failed.')), type, quality));
  }

  private resize(): void {
    const maxDpr = Math.min(devicePixelRatio || 1, 2) * this.qualityScale;
    const width = Math.max(2, Math.floor(this.canvas.clientWidth * maxDpr));
    const height = Math.max(2, Math.floor(this.canvas.clientHeight * maxDpr));
    if (width === this.width && height === this.height) return;
    this.width = this.canvas.width = width;
    this.height = this.canvas.height = height;
    for (const texture of this.pingTextures) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
    }
    this.histories.forEach((history) => {
      this.allocateTexture(history.texture, width, height);
      this.allocateTexture(history.sourceTexture, width, height);
      history.ready = false;
      history.sourceReady = false;
      history.motionWidth = 0;
      history.motionHeight = 0;
    });
  }

  private createTexture(): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error('Could not create a GPU texture.');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return texture;
  }

  private allocateTexture(texture: WebGLTexture, width = this.width, height = this.height): void {
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
  }

  private historyFor(id: string): HistoryBuffer {
    const existing = this.histories.get(id);
    if (existing) return existing;
    const texture = this.createTexture();
    this.allocateTexture(texture);
    const framebuffer = this.gl.createFramebuffer();
    if (!framebuffer) throw new Error('Could not create a node history framebuffer.');
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
    const sourceTexture = this.createTexture();
    this.allocateTexture(sourceTexture);
    const sourceFramebuffer = this.gl.createFramebuffer();
    if (!sourceFramebuffer) throw new Error('Could not create a node source-history framebuffer.');
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, sourceFramebuffer);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, sourceTexture, 0);
    const motionTexture = this.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, motionTexture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    const motionFramebuffer = this.gl.createFramebuffer();
    if (!motionFramebuffer) throw new Error('Could not create a datamosh motion framebuffer.');
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, motionFramebuffer);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, motionTexture, 0);
    const history = { texture, framebuffer, sourceTexture, sourceFramebuffer, motionTexture, motionFramebuffer, motionWidth: 0, motionHeight: 0, ready: false, sourceReady: false };
    this.histories.set(id, history);
    return history;
  }

  private pruneHistories(activeIds: Set<string>): void {
    this.histories.forEach((history, id) => {
      if (activeIds.has(id)) return;
      this.gl.deleteFramebuffer(history.framebuffer);
      this.gl.deleteTexture(history.texture);
      this.gl.deleteFramebuffer(history.sourceFramebuffer);
      this.gl.deleteTexture(history.sourceTexture);
      this.gl.deleteFramebuffer(history.motionFramebuffer);
      this.gl.deleteTexture(history.motionTexture);
      this.histories.delete(id);
    });
  }

  private prepareDatamoshMotion(source: WebGLTexture, effect: EffectNodeV2, pointer: PointerState, time: number, history: HistoryBuffer): void {
    const block = Math.max(4, effect.parameters.p1);
    const width = Math.max(1, Math.ceil(this.width / block));
    const height = Math.max(1, Math.ceil(this.height / block));
    if (width !== history.motionWidth || height !== history.motionHeight) {
      this.allocateTexture(history.motionTexture, width, height);
      history.motionWidth = width;
      history.motionHeight = height;
    }
    this.draw('datamoshMotion', source, history.motionFramebuffer, effect, pointer, time, history, width, height);
  }

  private program(kind: keyof typeof SHADERS): WebGLProgram {
    const cached = this.programs.get(kind);
    if (cached) return cached;
    const gl = this.gl;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Could not create shader.');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`${kind}: ${gl.getShaderInfoLog(shader)}`);
      return shader;
    };
    const program = gl.createProgram();
    if (!program) throw new Error('Could not create GPU program.');
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `${HEADER}\n${SHADERS[kind]}`));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`${kind}: ${gl.getProgramInfoLog(program)}`);
    this.programs.set(kind, program);
    return program;
  }

  private draw(kind: keyof typeof SHADERS, source: WebGLTexture, framebuffer: WebGLFramebuffer | null, effect: EffectNodeV2 | null, pointer: PointerState, time: number, history?: HistoryBuffer, viewportWidth = this.width, viewportHeight = this.height): void {
    const gl = this.gl;
    const program = this.program(kind);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, viewportWidth, viewportHeight);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const bind = (unit: number, texture: WebGLTexture, name: string) => {
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(gl.getUniformLocation(program, name), unit);
    };
    bind(0, source, 'u_source');
    bind(1, history?.ready ? history.texture : source, 'u_history');
    bind(2, this.asciiTexture, 'u_ascii');
    bind(3, history?.sourceReady ? history.sourceTexture : source, 'u_previousSource');
    bind(4, history?.motionTexture ?? source, 'u_motion');
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), this.width, this.height);
    gl.uniform2f(gl.getUniformLocation(program, 'u_motionResolution'), history?.motionWidth || 1, history?.motionHeight || 1);
    gl.uniform2f(gl.getUniformLocation(program, 'u_pointer'), pointer.x, pointer.y);
    gl.uniform1f(gl.getUniformLocation(program, 'u_pointerActive'), pointer.active);
    gl.uniform1f(gl.getUniformLocation(program, 'u_pointerVelocity'), pointer.velocity);
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time);
    gl.uniform1f(gl.getUniformLocation(program, 'u_asciiCount'), Math.max(1, [...this.asciiCharset].length));
    gl.uniform1f(gl.getUniformLocation(program, 'u_seed'), effect ? effect.seed % 10000 : 0);
    for (const key of ['p0','p1','p2','p3'] as const) gl.uniform1f(gl.getUniformLocation(program, `u_${key}`), effect?.parameters[key] ?? 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  destroy(): void {
    this.histories.forEach((history) => {
      this.gl.deleteFramebuffer(history.framebuffer); this.gl.deleteTexture(history.texture);
      this.gl.deleteFramebuffer(history.sourceFramebuffer); this.gl.deleteTexture(history.sourceTexture);
      this.gl.deleteFramebuffer(history.motionFramebuffer); this.gl.deleteTexture(history.motionTexture);
    });
    this.histories.clear();
    this.framebuffers.forEach((framebuffer) => this.gl.deleteFramebuffer(framebuffer));
    [...this.pingTextures, this.sourceTexture, this.asciiTexture].forEach((texture) => this.gl.deleteTexture(texture));
    this.programs.forEach((program) => this.gl.deleteProgram(program));
    this.programs.clear();
  }

  private updateAscii(raw: string): void {
    const charset = [...new Set([...raw])].slice(0, 24).join('') || ' .#';
    if (charset === this.asciiCharset) return;
    this.asciiCharset = charset;
    const glyphWidth = 32, height = 48;
    const atlas = document.createElement('canvas');
    atlas.width = glyphWidth * [...charset].length;
    atlas.height = height;
    const context = atlas.getContext('2d')!;
    context.fillStyle = '#000'; context.fillRect(0, 0, atlas.width, atlas.height);
    context.fillStyle = '#fff'; context.font = '700 34px ui-monospace, Menlo, monospace';
    context.textAlign = 'center'; context.textBaseline = 'middle';
    [...charset].forEach((glyph, index) => context.fillText(glyph, index * glyphWidth + glyphWidth / 2, height / 2 + 1));
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.asciiTexture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, atlas);
  }
}
