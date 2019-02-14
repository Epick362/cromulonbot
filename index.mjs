import Discord from 'discord.js'
import schedule from 'node-schedule-tz'
import { prefix, token } from './config'

const client = new Discord.Client()

var rule = new schedule.RecurrenceRule();
rule.hour = 0;
rule.minute = 7;
rule.tz = 'Europe/Bratislava';

client.once('ready', () => {
  console.log('ready')

  var r = schedule.scheduleJob(rule, function() {
    // Call your desired function
    sendL33Tmessage()
    console.log("Sending Messages");
  })
})

function sendL33Tmessage() {
  var guild = client.guilds.get('125721306564919297');
  if(guild && guild.channels.get('545735909899763722')){
      guild.channels.get('545735909899763722').send("HMMM...");
  }
}


client.login(token)