const express = require('express')

const { googleOauthRequired } = require('../middlewares/google-oauth.middleware');
const videosControllers = require('../controllers/videos.controller')

const router = express.Router()

router.post('/', googleOauthRequired, videosControllers.importRemoveVideos)
router.get('/all', googleOauthRequired, videosControllers.getAllVideos)
router.get('/:id', videosControllers.getVideoDetails)

// router.get('/:id/comments')
// router.post('/:id/comments')
// router.get('/comments/:id/replays')
// router.post('/comments/:id/replays')
// router.delete('/comments/:id')
// router.put('/comments/:id')

module.exports = router