/** Screen-space gesture classification, independent of terrain scale and camera inertia. */
export class PointerGesture {
 private pointers=new Set<number>();
 private origin={x:0,y:0};
 private threshold=4;
 private blocked=true;
 private completed=false;
 begin(id:number,x:number,y:number,touch=false,cameraMoving=false){
  if(this.pointers.size===0){this.origin={x,y};this.threshold=touch?8:4;this.blocked=cameraMoving;this.completed=false;}
  this.pointers.add(id);
  if(this.pointers.size>1)this.blocked=true;
 }
 move(id:number,x:number,y:number){
  if(this.pointers.has(id)&&Math.hypot(x-this.origin.x,y-this.origin.y)>=this.threshold)this.blocked=true;
 }
 end(id:number,x:number,y:number){
  if(!this.pointers.has(id))return;
  this.move(id,x,y);this.pointers.delete(id);this.completed=this.pointers.size===0;
 }
 cancel(){this.pointers.clear();this.blocked=true;this.completed=false;}
 allowsContextMenu(){return !this.blocked&&(this.completed||this.pointers.size===1);}
 allowsClick(){return this.completed&&!this.blocked;}
}
