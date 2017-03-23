const express = require('express')
const NeDB = require('nedb')
const request = require('request')
const cheerio = require('cheerio')

const app = express()

const port = Number(process.env.PORT || 8080)
const db = new NeDB({ filename: 'jokes.db', autoload: true })
            
db.count({}, (err, count) => {
        if (err) return console.log(err)

        if (!count) {
            const maxPage = 310
            let i = 10
            function fetchJokes(i) {
                const URL = `http://onelinefun.com/${i}/`
                console.log(URL)
                request(URL, (err, response, html) => {
                    if (err) {
                        console.log(err)
                    } else {
                        i++
                        let $ = cheerio.load(html)
                        $('.oneliner p').map((index, el) => {
                            db.insert({joke: $(el).text()}, err => err && console.log(err))
                        })
                    }
                    if (i <= maxPage) fetchJokes(i)
                })
            }
            fetchJokes(i)
        }
    })

app.get('/', (req, res) => {
    db.count({}, (err, count) => {
        if (err) return console.log(err)
        db
        .find({})
        .limit(1)
        .skip(Math.floor(Math.random() * count))
        .exec((err, [joke]) => {
            if (err) return console.log(err)
            res.json(joke)
        })
    })
})

app.get('/jokes/:page?', (req, res) => {
    const page = req.params.page || 1
    const size = 10
    db
        .find({})
        .sort({updatedAt: -1})
        .skip(page > 1
            ? page * size
            : 0)
        .limit(size)
        .exec(function (err, jokes) {
            if (err) 
                res.send(err)
            res.json(jokes)
        })
})

app.listen(port, function () {
    console.log('Listening on port ' + port)
})

// db.insert({joke: 'more crazy jokes'}, err => err && console.log(err))