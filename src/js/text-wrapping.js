// Preserve literal text, prefer word boundaries, and split long words/scripts
// at Unicode code points when no complete word fits the available width.
function wrap(text,width,measure){
 const lines=[];let line='';for(const char of Array.from(text)){
  if(line && measure(line+char)>width){const space=line.lastIndexOf(' ');if(space>0 && char!==' '){lines.push(line.slice(0,space+1));line=line.slice(space+1)+char;}else{lines.push(line);line=char;}}
  else line+=char;
 }if(line)lines.push(line);return lines;
}
module.exports=wrap;
