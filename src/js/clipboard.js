// Native clipboard tools are invoked directly, never through a shell. Browser
// integration uses copy/cut/paste events so the user's gesture grants access.
function createClipboard(platform=process.platform,execute){
    const run=execute || require('child_process').execFileSync;
    return {
        read(){
            if(platform==='darwin')return run('/usr/bin/pbpaste',[],{encoding:'utf8'});
            if(platform==='win32')return run('powershell.exe',['-NoProfile','-NonInteractive','-Command','[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); Get-Clipboard -Raw'],{encoding:'utf8'}).replace(/\r?\n$/,'');
            try{return run('wl-paste',['--no-newline'],{encoding:'utf8',stdio:['pipe','pipe','ignore']});}catch(error){return run('xclip',['-selection','clipboard','-o'],{encoding:'utf8'});}
        },
        write(text){
            if(platform==='darwin')run('/usr/bin/pbcopy',[],{input:text,encoding:'utf8'});
            else if(platform==='win32')run('powershell.exe',['-NoProfile','-NonInteractive','-Command','[Console]::InputEncoding=[System.Text.UTF8Encoding]::new(); $text=[Console]::In.ReadToEnd(); Set-Clipboard -Value $text'],{input:text,encoding:'utf8'});
            else {try{run('wl-copy',[],{input:text,encoding:'utf8',stdio:['pipe','pipe','ignore']});}catch(error){run('xclip',['-selection','clipboard'],{input:text,encoding:'utf8'});}}
        }
    };
}
module.exports={createClipboard};
