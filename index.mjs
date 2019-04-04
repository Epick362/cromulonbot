import dotenv from 'dotenv'
import Discord from 'discord.js'
import schedule from 'node-schedule-tz'
import Enmap from 'enmap'
import _ from 'lodash'
import moment from 'moment'
import 'moment-timezone';

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

const L33T_HOUR = 21
const L33T_MINUTE = 12

client.on('ready', () => {
  console.log('connected')

  setupRecurrentAnnouncement()
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
  let isInRound = _.find(roundContestants, {author: message.author.id})

  if (
    isL33TTime() &&
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

function getL33Tmoment() {
  return moment().tz('Europe/Vienna').hours(L33T_HOUR).minutes(L33T_MINUTE)
}

function isL33TTime() {
  let leetTime = getL33Tmoment()
  let currentTime = moment()

  return leetTime.hours === currentTime.hours && leetTime.minutes === currentTime.minutes
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

function setupRecurrentAnnouncement() {
  const rule = new schedule.RecurrenceRule()

  let leetTime = getL33Tmoment()

  rule.hour = leetTime.local().hours()
  rule.minute = leetTime.local().minutes() + 1

  schedule.scheduleJob(rule, () => {
    console.log('schedule run')

    if (points.isReady) {
      sendL33Tmessage()
    } else {
      console.error('Cannot send leet messages because DB is not ready')
    }
  })
}

client.login(process.env.DISCORD_TOKEN)