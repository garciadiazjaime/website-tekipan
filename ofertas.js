/* The OfertasDAO must be constructed with a connected database object */
function OfertasDAO(Oferta) {
    "use strict";

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof OfertasDAO)) {
        console.log('Warning: OfertsDAO constructor called without "new" operator');
        return new OfertasDAO(Oferta);
    }

    // var posts = db.collection("posts");

    this.insertEntry = function (data, callback) {

        var oferta = new Oferta({
            title: data.title,
            href: data.href,
            timestamp: data.timestamp,
            description: data.description,
            salary: data.salary,
            company: data.company,
            tag: data.tag,
            source: data.source,
        });

        oferta.save(function(err, data){
            if (err){
                return console.error(err);  
            }
            callback(data);
        })
    }

    // this.getPosts = function(num, callback) {
    //     "use strict";

    //     posts.find().sort('date', -1).limit(num).toArray(function(err, items) {
    //         "use strict";

    //         if (err) return callback(err, null);

    //         console.log("Found " + items.length + " posts");

    //         callback(err, items);
    //     });
    // }

    // this.getPostsByTag = function(tag, num, callback) {
    //     "use strict";

    //     posts.find({ tags : tag }).sort('date', -1).limit(num).toArray(function(err, items) {
    //         "use strict";

    //         if (err) return callback(err, null);

    //         console.log("Found " + items.length + " posts");

    //         callback(err, items);
    //     });
    // }

    // this.getPostByPermalink = function(permalink, callback) {
    //     "use strict";
    //     posts.findOne({'permalink': permalink}, function(err, post) {
    //         "use strict";

    //         if (err) return callback(err, null);

    //         callback(err, post);
    //     });
    // }

    // this.addComment = function(permalink, name, email, body, callback) {
    //     "use strict";

    //     var comment = {'author': name, 'body': body}

    //     if (email != "") {
    //         comment['email'] = email
    //     }

    //     // hw3.3 TODO
    //     callback(Error("addComment NYI"), null);
    // }
}

module.exports.OfertasDAO = OfertasDAO;
