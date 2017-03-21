"use strict"
const express = require('express')
const publicRouter = express.Router()
const privateRouter = express.Router()
const adminRouter = express.Router()
const lineRun = require('../../models/lineRun').lineRun
const validator = require('validator')
const async = require('async')
const ObjectId = require('mongoose').Types.ObjectId
const logger = require('../../config/logger').mainLogger
const fs = require('fs')
const pathFinder = require('../../helper/pathFinder')
const scoreCalculator = require('../../helper/scoreCalculator')

var socketIo

module.exports.connectSocketIo = function (io) {
  socketIo = io
}

/**
 * @api {get} /runs/line Get runs
 * @apiName GetRun
 * @apiGroup Run
 * @apiVersion 1.0.0
 *
 * @apiParam {Boolean} [populate] Whether to populate references with name
 *
 * @apiSuccess (200) {Object[]} -             Array of runs
 * @apiSuccess (200) {String}   -._id
 * @apiSuccess (200) {String}   -.competition
 * @apiSuccess (200) {String}   -.round
 * @apiSuccess (200) {String}   -.team
 * @apiSuccess (200) {String}   -.field
 * @apiSuccess (200) {String}   -.map
 * @apiSuccess (200) {Number}   -.score
 * @apiSuccess (200) {Object}   -.time
 * @apiSuccess (200) {Number}   -.time.minutes
 * @apiSuccess (200) {Number}   -.time.seconds
 *
 * @apiError (400) {String} msg The error message
 */
publicRouter.get('/', getLineRuns)
function getLineRuns(req, res) {
  const competition = req.query.competition || req.params.competition

  var query
  if (competition != null && competition.constructor === String) {
    query = lineRun.find({competition: competition})
  } else if (Array.isArray(competition)) {
    query = lineRun.find({competition: {$in: competition.filter(ObjectId.isValid)}})
  } else {
    query = lineRun.find({})
  }

  query.select("competition round team field map score time")

  if (req.query['populate'] !== undefined && req.query['populate']) {
    query.populate([
      {path: "competition", select: "name"},
      {path: "round", select: "name"},
      {path: "team", select: "name"},
      {path: "field", select: "name"},
      {path: "map", select: "name"}
    ])
  }

  query.lean().exec(function (err, data) {
    if (err) {
      logger.error(err)
      res.status(400).send({msg: "Could not get runs"})
    } else {
      res.status(200).send(data)
    }
  })
}
module.exports.getLineRuns = getLineRuns

/**
 * @api {get} /runs/line/:runid Get run
 * @apiName GetRun
 * @apiGroup Run
 * @apiVersion 1.0.0
 *
 * @apiParam {String} runid The run id
 *
 * @apiParam {Boolean} [populate] Whether to populate object references
 *
 * @apiSuccess (200) {String}       _id
 * @apiSuccess (200) {String}       competition
 * @apiSuccess (200) {String}       round
 * @apiSuccess (200) {String}       team
 * @apiSuccess (200) {String}       field
 * @apiSuccess (200) {String}       map
 *
 * @apiSuccess (200) {Object[]}     tiles
 * @apiSuccess (200) {Boolean}      tiles.isDropTile
 * @apiSuccess (200) {Object}       tiles.scoredItems
 * @apiSuccess (200) {Boolean}      tiles.scoredItems.obstacles
 * @apiSuccess (200) {Boolean}      tiles.scoredItems.speedbumps
 * @apiSuccess (200) {Boolean}      tiles.scoredItems.intersection
 * @apiSuccess (200) {Boolean}      tiles.scoredItems.gaps
 * @apiSuccess (200) {Boolean}      tiles.scoredItems.dropTile
 * @apiSuccess (200) {Number[]}     LoPs
 * @apiSuccess (200) {Number}       evacuationLevel
 * @apiSuccess (200) {Boolean}      exitBonus
 * @apiSuccess (200) {Number}       rescuedLiveVictims
 * @apiSuccess (200) {Number}       rescuedDeadVictims
 * @apiSuccess (200) {Number}       score
 * @apiSuccess (200) {Boolean}      showedUp
 * @apiSuccess (200) {Object}       time
 * @apiSuccess (200) {Number{0-8}}  time.minutes
 * @apiSuccess (200) {Number{0-59}} time.seconds
 *
 * @apiError (400) {String} err The error message
 * @apiError (400) {String} msg The error message
 */
publicRouter.get('/:runid', function (req, res, next) {
  const id = req.params.runid
  
  if (!ObjectId.isValid(id)) {
    return next()
  }

  const query = lineRun.findById(id, "-__v")

  if (req.query['populate'] !== undefined && req.query['populate']) {
    query.populate(["round", "team", "field", "competition", {
      path    : 'tiles',
      populate: {path: 'tileType'}
    }])
  }

  query.lean().exec(function (err, data) {
    if (err) {
      logger.error(err)
      return res.status(400).send({err: err.message, msg: "Could not get run"})
    } else {
      return res.status(200).send(data)
    }
  })
})

/**
 * @api {put} /runs/line/:runid Update run
 * @apiName PutRun
 * @apiGroup Run
 * @apiVersion 1.0.0
 *
 * @apiParam {String} runid The run id

 * @apiParam {Object[]}     [tiles]
 * @apiParam {Boolean}      [tiles.isDropTile]
 * @apiParam {Object}       [tiles.scoredItems]
 * @apiParam {Boolean}      [tiles.scoredItems.obstacles]
 * @apiParam {Boolean}      [tiles.scoredItems.speedbumps]
 * @apiParam {Boolean}      [tiles.scoredItems.intersection]
 * @apiParam {Boolean}      [tiles.scoredItems.gaps]
 * @apiParam {Boolean}      [tiles.scoredItems.dropTile]
 * @apiParam {Number[]}     [LoPs]
 * @apiParam {Number=1,2}   [evacuationLevel]
 * @apiParam {Boolean}      [exitBonus]
 * @apiParam {Number}       [rescuedLiveVictims]
 * @apiParam {Number}       [rescuedDeadVictims]
 * @apiParam {Boolean}      [showedUp]
 * @apiParam {Object}       [time]
 * @apiParam {Number{0-8}}  [time.minutes]
 * @apiParam {Number{0-59}} [time.seconds]
 *
 * @apiSuccess (200) {String} msg   Success msg
 * @apiSuccess (200) {String} score The current score
 *
 * @apiError (400) {String} err The error message
 * @apiError (400) {String} msg The error message
 */
privateRouter.put('/:runid', function (req, res, next) {
  const id = req.params.runid
  if (!ObjectId.isValid(id)) {
    return next()
  }
  
  const run = req.body

  // Exclude fields that are not allowed to be publicly changed
  lineRun.findById(id, "-_id -__v -competition -round -team -field -map -score", function (err, dbRun) {
    if (err) {
      logger.error(err)
      res.status(400).send({msg: "Could not get run"})
    } else {

      if (run.tiles.constructor === Object) { // Handle dict as "sparse" array
        const tiles = run.tiles
        run.tiles = []
        Object.keys(tiles).forEach(function (key) {
          if (!isNaN(key)) {
            run.tiles[key] = tiles[key]
          }
        })
      }

      // Recursively updates properties in "dbObj" from "obj"
      const copyProperties = function (obj, dbObj) {
        for (let prop in obj) {
          if (obj.hasOwnProperty(prop) && dbObj.hasOwnProperty(prop) ||
              dbObj.get(prop) !== undefined) { // Mongoose objects don't have hasOwnProperty
            if (typeof obj[prop] == 'object') { // Catches object and array
              return copyProperties(obj[prop], dbObj[prop])
            } else if (obj[prop] !== undefined) {
              dbObj[prop] = obj[prop]
            }
          } else {
            return new Error("Illegal key: " + prop)
          }
        }
      }

      err = copyProperties(run, dbRun)

      if (err) {
        logger.error(err)
        return res.status(400).send({
          err: err.message,
          msg: "Could not save run"
        })
      }

      dbRun.score = scoreCalculator.calculateScore(dbRun)

      dbRun.save(function (err) {
        if (err) {
          logger.error(err)
          return res.status(400).send({
            err: err.message,
            msg: "Could not save run"
          })
        } else {
          if (socketIo !== undefined) {
            socketIo.sockets.in('runs/').emit('changed')
            socketIo.sockets.in('runs/' + dbRun._id).emit('data', dbRun)
            socketIo.sockets.in('fields/' +
                                dbRun.field).emit('data', {newRun: dbRun._id})
          }
          return res.status(200).send({msg: "Saved run", score: dbRun.score})
        }
      })
    }
  })
})

/**
 * @api {delete} /runs/line/:runid Delete run
 * @apiName DeleteRun
 * @apiGroup Run
 * @apiVersion 1.0.0
 *
 * @apiParam {String} runid The run id
 *
 * @apiSuccess (200) {String} msg Success msg
 *
 * @apiError (400) {String} err The error message
 */
adminRouter.delete('/:runid', function (req, res, next) {
  var id = req.params.runid
  
  if (!ObjectId.isValid(id)) {
    return next()
  }
  
  lineRun.remove({_id: id}, function (err) {
    if (err) {
      logger.error(err)
      res.status(400).send({err: "Could not remove run"})
    } else {
      res.status(200).send({msg: "Run has been removed!"})
    }
  })
})

/**
 * @api {post} /runs/line Create new run
 * @apiName PostRun
 * @apiGroup Run
 * @apiVersion 1.0.0
 *
 * @apiParam {String} competition The competition id
 * @apiParam {String} round       The round id
 * @apiParam {String} team        The team id
 * @apiParam {String} field       The field id
 * @apiParam {String} map         The map id
 *
 * @apiSuccess (200) {String} msg Success msg
 * @apiSuccess (200) {String} id  The new run id
 *
 * @apiError (400) {String} err The error message
 */
adminRouter.post('/', function (req, res) {
  const run = req.body
  
  new lineRun({
    competition: run.competition,
    round      : run.round,
    team       : run.team,
    field      : run.field,
    map        : run.map
  }).save(function (err, data) {
    if (err) {
      logger.error(err)
      return res.status(400).send({msg: "Error saving run in db"})
    } else {
      res.location("/api/runs/" + data._id)
      return res.status(201).send({
        err: "New run has been saved",
        id : data._id
      })
    }
  })
})

publicRouter.all('*', function (req, res, next) {
  next()
})
privateRouter.all('*', function (req, res, next) {
  next()
})

module.exports.public = publicRouter
module.exports.private = privateRouter
module.exports.admin = adminRouter