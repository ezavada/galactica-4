const I18n=require('./i18n.js');
function apply(event){if(!event.playerMessage)return event;const row=event.playerMessage;event.title=I18n.formatString(1205,'Message from {0}',row.sender===-2?I18n.getString(1190):row.name);event.message=row.text;return event;}
module.exports={apply};
