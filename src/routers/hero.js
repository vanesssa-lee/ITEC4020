const express = require('express')
const router = new express.Router()

// models
const Hero = require(__basedir + '/models/hero')
const Comment = require(__basedir + '/models/comment')

const DEFAULT_HEROES_PER_PAGE = 10
const DEFAULT_COMMENTS_PER_PAGE = 3

/**
 * Some API endpoints in this application are sorted and paginated. Here, we will go over
 * some details about sorting and paginating the resulting heroes.
 * 
 * In this applicaiton, we sort the heroes in our database based on "name" alphabetically
 * so that top results start with A going all the way to Z. To learn how to use sort in mongoose,
 * please visit their documentation: https://mongoosejs.com/docs/api.html#query_Query-sort
 * 
 * Pagination is used to return parts of the results to the user in series of pages.
 * You can read about pagination in mongodb here: https://docs.mongodb.com/manual/reference/method/cursor.skip/#pagination-example
 * For example imagine that maximum number of items per page is 5 and we have 7 items in
 * our database. As a result, we need to return the first 5 elements in the first page.
 * For the second page, we need to `skip` over the first 5 elements and return the remaining
 * elements (up to a maximum of 5). As a result, our query from the database for paginated
 * results would typically look like this:
 *    const results = await Hero.find({...}).sort({...}).skip((page - 1) * limit).limit(limit)
 * Note: `page` is the page that we want to fetch the results for and `limit` is the maximum
 * number of elements allowed per page. In our previous example, limit was 5.
 * Note: the number of pages can be calculated as `Math.ceil(count / limit)`
 * 
 * In this application, we will use the `DEFAULT_HEROES_PER_PAGE` variable as the maximum 
 * number of items per page for the endpoints
 * that return a list of heroes and `DEFAULT_COMMENTS_PER_PAGE` variable as the maximum 
 * number of items per page for the endpoints that return a list of comments.
 */

// GET /heroes -> gets a list of heroes, sorted and paginated
router.get('/heroes', async (req, res) => {
  // TODO: fill out the code for the endpoint
  var page = req.query.page;
  if (isNaN(page)) {
    page = 1;
  }

  var previousPage = page - 1;
  var nextPage = parseInt(page) + 1;

  if (page == 1) {
    previousPage = 1;
  }

  var count = await Hero.countDocuments({});
  var pageCount = Math.ceil(count / DEFAULT_HEROES_PER_PAGE);

  const results = await Hero
    .find({})
    .sort({name: 'asc'})
    .skip((page - 1) * DEFAULT_HEROES_PER_PAGE)
    .limit(DEFAULT_HEROES_PER_PAGE)
    .lean();

  let context = {
    data: results,
    count,
    pagination: {
      previousPage,
      nextPage,
      page: parseInt(page),
      pageCount
    }
  }
  
  res.render('home', context);
})

// GET /heroes/:id --> gets a hero by id
router.get('/heroes/:id', async (req, res) => {
  // TODO: fill out the code for the endpoint
  const id = req.params.id;

  // Hero.find({_id: id}, (err, data) => {
  //   if (err){
  //     return res.status(404).send({
  //       err: {
  //         id: "The hero id sent was not found."
  //       }
  //     })
  //   }
  //   return res.send(data);
  // });

  const results = await Hero
    .find({_id: id})
    .lean();
  
  let context = {results};
  res.render('details', context);
})

// POST /search/heroes/by-name --> searches for heroes by name, starting with the query provided as JSON object {"query": "..."}, sorted and paginated
/**
 * Note: only return heroes whose names **start** with the provided query. For example, if our request says
 * `{"query": "fla"}`, we need to look for heroes whose names start with `fla` (case **insensitive**) like `Flash`.
 */
router.post('/search/heroes/by-name', async (req, res) => {
  // TODO: fill out the code for the endpoint
  const page = req.query.page;
  const qname = new RegExp("^" + req.body.query, "i");
  
  const results = await Hero
    .find({name: qname})
    .sort({name: 'asc'})
    .skip((page - 1) * DEFAULT_HEROES_PER_PAGE)
    .limit(DEFAULT_HEROES_PER_PAGE);

  var count = await Hero.find({name: qname}).countDocuments({});
  var pageCount = Math.ceil(count / DEFAULT_HEROES_PER_PAGE);

  return res.send({
    data: results,
    count,
    pagination: {
      page: parseInt(page),
      pageCount
    }
  });
})

// POST /search/heroes/by-min-stats --> searches for heroes with powerstats greater than or equal to the provided values.
/**
 * Note: here, return heroes with powerstats greater than or equal to the provided values.
 * For example, if the query object is `{"speed": 100, "intelligence": 95}`, we are looking for heroes
 * whose `powerstats.speed` is greater than or equal to 100 **and** `powerstats.intelligence` is greater
 * than or equal to 95. The following powerstats would be acceptable:
 * 
 * "powerstats": {
 *    "intelligence": 100,
 *    "strength": 85,
 *    "speed": 100,
 *    "durability": 100,
 *    "power": 100,
 *    "combat": 50
 *  }
 * 
 */
router.post('/search/heroes/by-min-stats', async (req, res) => {
  // TODO: fill out the code for the endpoint
  const page = req.query.page;
  const powerstats = req.body;
  const conditions = [];
  for (let key in powerstats) {
    conditions.push({
      [`powerstats.${key}`]: {
        $gte: powerstats[key]
      }
    })
  }

  const results = await Hero
    .find({$and: conditions})
    .sort({name: 'asc'})
    .skip((page - 1) * DEFAULT_HEROES_PER_PAGE)
    .limit(DEFAULT_HEROES_PER_PAGE);

  var count = await Hero
    .find({$and: conditions})
    .countDocuments({});
  var pageCount = Math.ceil(count / DEFAULT_HEROES_PER_PAGE);

  return res.send({
    data: results,
    count,
    pagination: {
      page: parseInt(page),
      pageCount
    }
  });
})

router.get('/search', async (req, res) => {
  var page = req.query.page;
  const qname = new RegExp("^" + req.query.name, "i");
  const qgender = req.query.gender;
  const qintell = req.query.intelligence;
  const qstrength = req.query.strength;
  const qspeed = req.query.speed;
  const qdurability = req.query.durability;
  const qpower = req.query.power;
  const qcombat = req.query.combat;
  
  const results = await Hero
    .find({
      name: qname,
      'appearance.gender': qgender,
      'powerstats.intelligence': {$gte: qintell},
      'powerstats.strength': {$gte: qstrength},
      'powerstats.speed': {$gte: qspeed},
      'powerstats.durability': {$gte: qdurability},
      'powerstats.power': {$gte: qpower},
      'powerstats.combat': {$gte: qcombat}})
    .sort({name: 'asc'})
    .skip((page - 1) * DEFAULT_HEROES_PER_PAGE)
    .limit(DEFAULT_HEROES_PER_PAGE)
    .lean();

  var count = await Hero.find({name: qname}).countDocuments({});
  var pageCount = Math.ceil(count / DEFAULT_HEROES_PER_PAGE);

  let context = {
    data: results,
    count,
    pagination: {
      page: parseInt(page),
      pageCount
    }
  }

  res.render('search', context);
})

// POST /heroes/:id/comments --> creates a comment for a hero, gets the object structure as JSON
/**
 * Note: here we want to `populate` the hero field.
 * For more information, see: https://mongoosejs.com/docs/populate.html
 */
router.post('/heroes/:id/comments', async (req, res) => {
  // TODO: fill out the code for the endpoint
  const id = req.params.id;
  const commentText = req.body.text;
  // await Comment.remove();
  const comment = new Comment({
    hero: id,
    text: commentText
  });

  await comment.save();
  
  const heroComment = await Comment
    .findById(comment._id)
    .populate('hero');
  
  return res.send({
    msg: "success!",
    comment: heroComment
  });
})

// GET /heroes/:id/comments --> gets the comments for a hero, paginated, sorted by posting date (descending, meaning from new to old)
router.get('/heroes/:id/comments', async (req, res) => {
  // TODO: fill out the code for the endpoint
  const id = req.params.id;
  const page = req.query.page;
  
  const results = await Comment
    .find({hero: id})
    .populate('hero')
    .sort({createdAt: 'desc'})
    .skip((page - 1) * DEFAULT_COMMENTS_PER_PAGE)
    .limit(DEFAULT_COMMENTS_PER_PAGE);

  var count = await Comment.find({hero: id}).countDocuments({});
  var pageCount = Math.ceil(count / DEFAULT_COMMENTS_PER_PAGE);

  return res.send({
    data: results,
    count,
    pagination: {
      page: parseInt(page),
      pageCount
    }
  });
})

module.exports = router
