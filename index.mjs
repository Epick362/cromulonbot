import dotenv from 'dotenv'
import Discord from 'discord.js'
import schedule from 'node-schedule-tz'
import Enmap from 'enmap'
import _ from 'lodash'

dotenv.config()

const client = new Discord.Client()
const points = new Enmap({name: "points"});


const servers = [
  {
    guild: '543038638473084938',
    channels: [
      '543038639060549643'
    ]
  }
]

/// THIS WILL BREAK SOON BUT IM LAZY NOW
const leetHour = 12
const leetMinute = 37


const rule = new schedule.RecurrenceRule()
rule.hour = leetHour
rule.minute = leetMinute + 1
rule.tz = 'Europe/Bratislava'

client.on('ready', () => {
  console.log('connected')

  schedule.scheduleJob(rule, function() {
    console.log('schedule run')
    // Call your desired function
    if (points.isReady) {
      sendL33Tmessage()
    } else {
      console.error('Cannot send leet messages because DB is not ready')
    }
  })
})

const pointsSpread = [
  25,
  18,
  15,
  12,
  10,
  8,
  6,
  4,
  2,
  1
]
let roundContestants = []
client.on('message', (message) => {
  let currentTime = new Date()
  let isInRound = _.find(roundContestants, {author: message.author.id})

  if (
    currentTime.getHours() === leetHour &&
    currentTime.getMinutes() === leetMinute &&
    message.content === '1337' &&
    !isInRound
  ) {
    let authorPoints = points.get(message.author.id) || 0
    let messagePoints = pointsSpread[Math.min(roundContestants.length, 9)]

    roundContestants.push({
      author: message.author.id,
      roundPoints: messagePoints
    })
    points.set(message.author.id, messagePoints + authorPoints)

    console.log(`${message.author.username} gets ${messagePoints} and has ${messagePoints+authorPoints} total`)
  }
})

function sendL33Tmessage() {
  servers.map(server => {
    let guild = client.guilds.get(server.guild)

    if (guild) {
      server.channels.map(channelId => {
        let channel = guild.channels.get(channelId)

        if (channel) {
          let allPoints = points.fetchEverything()

          Promise.all(allPoints.map((_, authorId) => {
            return guild.fetchMember(authorId)
          }))
          .then((users) => {
            const embed = new Discord.RichEmbed()
            embed.setColor(0xE9C452)
  
            if (roundContestants.length !== 0) {
              embed.setTitle("HMM...")
              embed.setImage("https://media.giphy.com/media/26gYOXsPBh3qv420E/source.gif")

              let leaderboardString = ''
              allPoints.map((points, authorId) => {
                let userName = _.find(users, {id: authorId}).user.username
                leaderboardString += `${userName} - ${points}\n`
              })
              embed.addField('Leaderboard', leaderboardString)
            } else {
              embed.setTitle("HMM... DISQUALIFIED")
              embed.setImage("https://media.giphy.com/media/12w45ho280Tg88/giphy.gif")
            }
  
            channel.send({embed})
  
            console.log(`Hmmm...-ed in ${guild.name} #${channel.name}`)
            console.log(`This round ranking:`, roundContestants)
            roundContestants = []
            console.log(`Current standings`, points.fetchEverything())
          })
        }
      })
    }
  })
}


client.login(process.env.DISCORD_TOKEN)