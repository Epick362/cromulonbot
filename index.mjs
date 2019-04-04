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
    guild: process.env.SERVER,
    channels: [
      process.env.CHANNEL
    ]
  }
]


const leetHour = 13
const leetMinute = 37


const rule = new schedule.RecurrenceRule()
rule.hour = leetHour - getBratislavaTimezoneOffset()
rule.minute = leetMinute + 1
// rule.tz = 'Europe/Bratislava' // not implemented yet, see https://github.com/node-schedule/node-schedule/pull/316

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
  let isLeetMessage = message.content === '1337'
  let isInRound = _.find(roundContestants, {author: message.author.id})

  if (
    isLeetTime() &&
    isLeetMessage &&
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

function getBratislavaTimezoneOffset() {
  let bratislavaIntlOptions = {'timeZone': 'Europe/Bratislava', 'hour': 'numeric', 'hour12': false}
  let bratislavaHour = new Intl.DateTimeFormat('en-US', bratislavaIntlOptions).format(new Date())

  let utcIntlOptions = {'timeZone': 'UTC', 'hour': 'numeric', 'hour12': false}
  let utcHour = new Intl.DateTimeFormat('en-US', utcIntlOptions).format(new Date())

  return bratislavaHour - utcHour
}

function isLeetTime() {
  let intlOptions = {'timeZone': 'Europe/Bratislava', 'hour': 'numeric', 'minute': 'numeric', 'hour12': false}
  let bratislavaTime = new Intl.DateTimeFormat('en-US', intlOptions).format(new Date())

  return bratislavaTime === (leetHour + ':' + leetMinute)
}

function sendL33Tmessage() {
  servers.map(server => {
    let guild = client.guilds.get(server.guild)

    if (guild) {
      server.channels.map(channelId => {
        let channel = guild.channels.get(channelId)

        if (channel) {
          let allPoints = points.fetchEverything()

          Promise.all(allPoints.map(async (_, authorId) => {
            try {
              return await guild.fetchMember(authorId)
            } catch(e) {
              return {
                id: authorId,
                user: { username: 'unknown' }
              }
            }
          }))
          .then((users) => {
            return composeRoundEnd(allPoints, users)
          })
          .then((embed) => {
            channel.send({embed})

            console.log(`Hmmm...-ed in ${guild.name} #${channel.name}`)
            console.log(`This round ranking:`, roundContestants)
            console.log(`Current standings`, points.fetchEverything())
          })
        }
      })
    }
  })
}

function composeRoundEnd(allPoints, users) {
  const embed = new Discord.RichEmbed()
  embed.setColor(0xE9C452)

  if (roundContestants.length !== 0) {
    embed.setTitle("HMM...")
    embed.setImage("https://media.giphy.com/media/26gYOXsPBh3qv420E/source.gif")

    let leaderboardString = ''

    let sortedPlayers = _.orderBy(Array.from(allPoints.keys()), key => allPoints.get(key), 'desc')

    sortedPlayers.map(player => {
      let points = allPoints.get(player)
      let userName = _.find(users, {id: player}).user.username
      leaderboardString += `${userName} - ${points}`

      let inContest = _.find(roundContestants, {author: player})
      if (inContest) {
        leaderboardString += ` (+${inContest.roundPoints})`
      }

      leaderboardString += `\n`
    })
    embed.addField('Leaderboard', leaderboardString)
  } else {
    embed.setTitle("HMM... DISQUALIFIED")
    embed.setImage("https://media.giphy.com/media/12w45ho280Tg88/giphy.gif")
  }

  roundContestants = []

  return embed
}


client.login(process.env.DISCORD_TOKEN)
