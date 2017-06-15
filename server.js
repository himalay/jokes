const express = require('express')
const NeDB = require('nedb')
const request = require('request')
const cheerio = require('cheerio')
const ontime = require('ontime')

const app = express()

const port = Number(process.env.PORT || 8080)
const db = new NeDB({ filename: 'jokes.db', autoload: true })

let maxPage = 0

//fetchJokes()

ontime({ cycle: ['04:00:00'] }, ot => {
    fetchJokes()
    ot.done()
})

 function fetchJokes() {
    request('http://onelinefun.com/1/', (err, response, html) => {
        if (err) return console.log(err)

        let $ = cheerio.load(html)
        const newMaxPage = +$('p.pagination > a:nth-child(5)').text()
        db.count({}, (err, count) => {
            if (err) return console.log(err)
            if (!count || !maxPage) {
                maxPage = maxPage || newMaxPage
                fetchJokesLoop(1)
            } else {
                if (newMaxPage > maxPage) {
                    maxPage = newMaxPage
                    db.remove({},{multi:true}, (err, count) => {
                        if (err) return console.log(err)
                        fetchJokesLoop(1)
                    })
                }
            }
        })
    })
}

 function fetchJokesLoop (i) {
    const URL = `http://onelinefun.com/${i}/`
    console.log(URL)
    request(URL, (err, response, html) => {
        if (err) {
            console.log('request: ' + err)
        } else {
            i++
            let $ = cheerio.load(html)
            maxPage = maxPage || +$('p.pagination > a:nth-child(5)').text()
            console.log('maxPage ' + maxPage)
            $('.oneliner p').map((index, el) => {
                db.insert({joke: $(el).text()}, err => err && console.log('insert error: '+ err))
            })
        }
        if (i <= maxPage) fetchJokesLoop(i)
    })
}

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
    if (req.query.q) {
        const joke = new RegExp(req.query.q)
        console.log(joke)
        db
            .find({ joke })
            .limit(20)
            .exec(function (err, jokes) {
                if (err) 
                    res.send(err)
                res.json(jokes)
            })
    } else {
        const page = req.params.page || 1
        const size = 10
        db
            .find({})
            .skip(page > 1
                ? page * size
                : 0)
            .limit(size)
            .exec(function (err, jokes) {
                if (err) 
                    res.send(err)
                res.json(jokes)
            })
    }
    
})

app.listen(port, function () {
    console.log('Listening on port ' + port)
})

// db.insert({joke: 'more crazy jokes'}, err => err && console.log(err))
