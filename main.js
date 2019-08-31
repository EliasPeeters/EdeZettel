const express = require('express');
const bodyparser = require('body-parser');
const mysql = require('mysql');
const cookieparser = require('cookie-parser');
const util = require('util');
const uuid = require('uuid/v4');
const fuse = require('fuse.js');
const request2 = require('request');
const fs = require('fs');
const geoip = require('geoip-lite');


const app = express();
exports.app = app;

// Important Stuff
// SELECT ingredientName, unitName FROM ingredients LEFT JOIN ingredients_units iu on ingredients.ingredientID = iu.ingredientID LEFT JOIN units u on iu.unitID = u.unitID;

var loggedInUsers = {};

const urlencodedparser = bodyparser.urlencoded({extended: false});

const connection = mysql.createConnection({
    host: "206.81.23.52",
    user: "shoppinglistuser",
    password: "FAPeFWTomLjUXAVeg7CrqjaVHEhmzZmvJnHUkZJEBerAKAKkRLp",
    database: "shoppinglist"
});

connection.asyncquery = util.promisify(connection.query).bind(connection);

app.set('view engine', 'ejs');
app.use('/assets', express.static('assets'));
app.use(cookieparser());
app.enable('trust proxy');


connection.connect((err) => {
    if (err) {
        console.log(err)
    } else {
        console.log('Connected');
    }
});

function logined(req, res) {
    if (req.cookies.sessionToken === undefined) {
        res.redirect('/login');
        return false;
    } else if (!(req.cookies.sessionToken in loggedInUsers)) {
        res.clearCookie('sessionToken');
        res.redirect('/login');
        return false;
    }
    return true;
}


app.get('/login', function (req, res) {
    let message;
    let color;
    if (req.query.message !== undefined) {
        message = req.query.message;
        color = req.query.color;
    } else {
        message = '';
        color = '';
    }
    res.render('login.ejs', {message: message, color: color});
});

app.post('/login', urlencodedparser, async function (req, res) {
    var uuidForUser = uuid();
    var userid = await connection.asyncquery('SELECT userID FROM user WHERE userName = \'' + req.body.username + '\' AND userPassword = \'' + req.body.password + '\'');
    if (userid[0] !== undefined) {
        res.cookie("sessionToken", uuidForUser);
        loggedInUsers[uuidForUser] = userid[0].userID;
        res.redirect('/lists');
    } else {
        res.redirect('/login?message=Dein Passwort und/oder Benutzername sind falsch&color=red');
    }

});

app.get('/register', urlencodedparser, function (req, res) {
   let message;
   let color;
    if (req.query.message !== undefined) {
        message = req.query.message;
        color = req.query.color;
    } else {
        message = '';
        color = '';
    }
    res.render('register.ejs', {message: message, color: color});
});

function checkForChars(input) {
    let substring;
    let counter = 0;
    for (let i=0; i< input.length; i++) {
        substring = input.substring(i, i+1);
        if (substring === '1') {counter++}
        else if (substring === '2') {counter++}
        else if (substring === '3') {counter++}
        else if (substring === '4') {counter++}
        else if (substring === '5') {counter++}
        else if (substring === '6') {counter++}
        else if (substring === '7') {counter++}
        else if (substring === '8') {counter++}
        else if (substring === '9') {counter++}
        else if (substring === '0') {counter++}
    }
    if (counter === input.length) {
        return false;
    }
    return true;
}

exports.checkForChars = checkForChars;

app.post('/register', urlencodedparser, async function (req, res) {
    if (req.body.password1 !== req.body.password2) {
        res.redirect('/register?color=red&message=Die Passwörter stimmen nicht überein');
        return;
    }
    if (req.body.userAdress.length > 5 || checkForChars(req.body.userAdress)) {
        res.redirect('/register?color=red&message=Die Postleitzahl ist ungültig');
        return;
    }
    let query = 'INSERT INTO user (userName, userPassword, userAdress) VALUES (\'' + req.body.username + '\',\'' + req.body.password1 + '\', ' + req.body.userAdress + ')';
    await connection.asyncquery(query);
    res.redirect('/login?color=green&message=Der Benutzer wurde erstellt');
});

app.get('/logout', urlencodedparser, function (req, res) {
    delete loggedInUsers[req.cookies.sessionToken];
    res.clearCookie("sessionToken");
    res.redirect('/login');
});

app.get('/lists', async function (req, res) {
    if (!logined(req, res)) {
        return
    }
    var sharedlists = await connection.asyncquery('SELECT * FROM sharedLists left join lists on sharedLists.listID = lists.listID WHERE sharedLists.userID = ' + loggedInUsers[req.cookies.sessionToken]);
    var lists = await connection.asyncquery('SELECT * FROM lists WHERE userID = ' + loggedInUsers[req.cookies.sessionToken]);
    let user = await connection.asyncquery('SELECT * FROM user WHERE userID = '+ loggedInUsers[req.cookies.sessionToken]);
    res.render('lists.ejs', {user: user, lists: lists, sharedlists: sharedlists});
});

app.get('/publiclist', async function (req, res) {
    let publicList = await connection.asyncquery('SELECT public, listID FROM lists WHERE uniqueID = \'' +  req.query.id + '\'');
    if (publicList.length === 0) {
        res.render('notpublic.ejs');
    }
    else if (publicList[0].public) {
        let id = publicList[0].listID;
        let name = await connection.asyncquery('SELECT listName FROM lists WHERE listID = ' + id );
        let items = await connection.asyncquery('SELECT * FROM items left join edekaproducts on items.productID = edekaproducts.productID left join ingredients on items.ingredientID = ingredients.ingredientID left join units on items.unitID = units.unitID WHERE listID = ' + id + ' ORDER BY itemsModifiedDate desc');
        items.forEach(function (item) {
            if (item.itemName !== null) {
                item.itemAmount = item.itemName;
            } else if (item.ingredientID === null) {
                if (item.productMarkenname === null) {
                    item.productMarkenname = 'EDEKA';
                }
                if (item.productAmount === null) {
                    item.ingredientNameSingular =  item.productArtikelbezeichnung + ' von ' + item.productMarkenname;
                } else {
                    item.ingredientNameSingular = item.productArtikelbezeichnung + ' von ' + item.productMarkenname + ' (' + item.productAmount + ')';
                }
            } else {
                if (item.itemAmount > 1 || item.unitID === 2 || item.unitID === 5) {
                    item.ingredientNameSingular = item.ingredientNamePlural;
                    item.unitName = item.unitNamePlural;
                }
            }
        });
        res.render('onelistpublic.ejs', {items: items, id: id, listname: name[0].listName});
    } else {
        res.render('notpublic.ejs');
    }
});

app.get('/onelist', async function (req, res) {
    if (!logined(req, res)) {
        return;
    }
    var listsUserID = await connection.asyncquery('SELECT userID, listName, public, uniqueID FROM lists WHERE listID = ' + req.query.id);
    var sharedlistsUserID = await connection.asyncquery('SELECT userID FROM sharedLists WHERE listID = ' + req.query.id);
    if (!(listsUserID[0].userID === loggedInUsers[req.cookies.sessionToken] || sharedlistsUserID[0].userID === loggedInUsers[req.cookies.sessionToken])) {
        res.redirect('/lists');
        return;
    }
    let listpublic;
    listpublic = listsUserID[0].public !== 0;

    let items = await connection.asyncquery('SELECT itemName, itemID, items.ingredientID, itemAmount, items.unitID, items.productID, itemsModifiedDate, productMarkenname, productArtikelbezeichnung, productAmount, ingredientNamePlural, ingredientNameSingular, unitName, unitNamePlural FROM items left join edekaproducts on items.productID = edekaproducts.productID left join ingredients on items.ingredientID = ingredients.ingredientID left join units on items.unitID = units.unitID WHERE listID = ' + req.query.id + ' ORDER BY itemsModifiedDate desc');
    items.forEach(function (item) {
        if (item.itemName !== null) {
            item.itemAmount = item.itemName;
        } else if (item.ingredientID === null) {
            if (item.productMarkenname === null) {
                item.productMarkenname = 'EDEKA';
            }
            if (item.productAmount === null) {
                item.ingredientNameSingular =  item.productArtikelbezeichnung + ' von ' + item.productMarkenname;
            } else {
                item.ingredientNameSingular = item.productArtikelbezeichnung + ' von ' + item.productMarkenname + ' (' + item.productAmount + ')';
            }
        } else {
            if (item.itemAmount > 1 || item.unitID === 2 || item.unitID === 5) {
                item.ingredientNameSingular = item.ingredientNamePlural;
                item.unitName = item.unitNamePlural;
            }
        }
    });


    let sharedUser = await connection.asyncquery('SELECT * FROM sharedLists LEFT JOIN user ON user.userID = sharedLists.userid WHERE sharedLists.listID = ' + req.query.id);
    let sharedlists = await connection.asyncquery('SELECT * FROM sharedLists left join lists on sharedLists.listID = lists.listID WHERE sharedLists.userID = ' + loggedInUsers[req.cookies.sessionToken]);
    let lists = await connection.asyncquery('SELECT * FROM lists WHERE userID = ' + loggedInUsers[req.cookies.sessionToken]);
    let user = await connection.asyncquery('SELECT * FROM user WHERE userID = '+ loggedInUsers[req.cookies.sessionToken]);
    let open = '';
    if (req.query.openshare === 'true') {
        open = 'openshare';
    }
    let link = 'localhost:8000/publiclist?id=' + listsUserID[0].uniqueID;
    res.render('onelist.ejs', {link: link, open: open, user: user, items: items, id: req.query.id, lists: lists, listname: listsUserID[0].listName, sharedlists: sharedlists, public: listpublic, sharedUser: sharedUser});
});

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

exports.makeid = makeid;

app.get('/newlist', async function (req, res) {
    if (!logined(req, res)) {
        return
    }
    var sharedlists = await connection.asyncquery('SELECT * FROM sharedLists left join lists on sharedLists.listID = lists.listID WHERE sharedLists.userID = ' + loggedInUsers[req.cookies.sessionToken]);
    var lists = await connection.asyncquery('SELECT * FROM lists WHERE userID = ' + loggedInUsers[req.cookies.sessionToken]);
    let user = await connection.asyncquery('SELECT * FROM user WHERE userID = '+ loggedInUsers[req.cookies.sessionToken]);

    res.render('newList.ejs', {user: user, lists: lists, sharedlists: sharedlists});
});

app.get('/deleteList', urlencodedparser, async function (req, res) {
    let deleteSharedLists = 'DELETE FROM lists WHERE listID = ' + req.query.id;
    let deleteList = 'DELETE FROM lists WHERE listID = ' + req.query.id ;
    let deleteItems = 'DELETE FROM items WHERE listID = ' + req.query.id;

    await connection.asyncquery(deleteSharedLists);
    await connection.asyncquery(deleteItems);
    await connection.asyncquery(deleteList);
    res.redirect('/lists');
});

app.get('/deleteshareduser', urlencodedparser, async function (req, res) {
   let query = 'DELETE FROM sharedLists WHERE id = \'' + req.query.id + '\';';
   let result = await connection.asyncquery(query);
   res.redirect('/onelist?id=' + req.query.listid + '&openshare=false');
});

app.get('/deleteitem', async function(req, res) {
    let query = 'DELETE FROM items WHERE itemID = ' + req.query.id;
    var result = connection.asyncquery(query);
    res.send('sucess');
});

app.get('/additem', urlencodedparser, async function (req, res) {
    let query;
    let secondquery;
    if (req.query.type === 'ingredients') {
        secondquery = 'SELECT * FROM items WHERE ingredientID = ' + req.query.itemid + ' AND listID = ' + req.query.id;
        let result = await connection.asyncquery(secondquery);
        let i = 0;
        let nothing = true;
        for (i; i < result.length; i++) {
            if (result[i].unitID.toString(10) === req.query.unitid) {
                let newamount = result[i].itemAmount + parseInt(req.query.amount);
                query = 'UPDATE items SET itemAmount = ' + newamount + ' WHERE itemID = ' + result[i].itemID;
                nothing = false;
                break;
            }
        }
        if (nothing) {
            query = 'INSERT INTO items ' + req.query.query;
        }

    } else if (req.query.type === 'edekaproducts') {
        secondquery = 'SELECT * FROM items WHERE productID = ' + req.query.itemid + ' AND listID = ' + req.query.id;
        let result = await connection.asyncquery(secondquery);
        let i = 0;
        if (result.length !== 0) {
            let newamount = result[i].itemAmount + parseInt(req.query.amount);
            query = 'UPDATE items SET itemAmount = ' + newamount + ' WHERE itemID = ' + result[i].itemID;
        } else {
            query = 'INSERT INTO items ' + req.query.query;
        }
    } else if (req.query.type === 'custom') {
        query = 'INSERT INTO items (itemName, listID) VALUES (\'' + req.query.custom + '\', ' +req.query.id +')';
    } else {
        query = 'INSERT INTO items ' + req.query.query;
    }

   await connection.asyncquery(query);
   res.redirect('/onelist?id=' + req.query.id);
});

app.get('/listpublic', urlencodedparser, async function (req, res) {
   let query = 'UPDATE lists SET public=' + req.query.public + ' WHERE listID=' + req.query.id;
   await connection.asyncquery(query);
   res.send('');
});

function removeUnits(input) {
    input = replace(input, 'Liter', '');
    input = replace(input, 'liter', '');
    input = replace(input, 'Gramm', '');
    input = replace(input, 'gramm', '');
    input = replace(input, 'Kilogramm', '');
    input = replace(input, 'kilogramm', '');
    input = replace(input, 'Packung', '');
    input = replace(input, 'packung', '');
    return input;
}

app.get('/iteminput', urlencodedparser, async function (req, res){
    try {
        req.query.text = removeUnits(req.query.text);
        let amount = parseFloat(req.query.text) || 1;
        let querys = [];
        let ids = [];
        let units = [];
        ids.push(0);
        let type = [];
        type.push('custom');
        let custom;
        querys.push('');
        units.push(0);

        if (req.query.text === '' || req.query.text === ' ') {
            res.send('<div id="items"></div>');
            return;
        }

        let items = await connection.asyncquery('SELECT * FROM ingredients natural left join ingredients_units natural left join units natural left join synonyme');
        let options = {
            shouldSort: true,
            threshold: 0.6,
            location: 0,
            distance: 100,
            maxPatternLength: 32,
            minMatchCharLength: 1,
            keys: [
                'ingredientNameSingular',
                'ingredientNamePlural',
                'synonymeText'
            ]
        };

        let search = new fuse(items, options);
        let result = search.search(req.query.text);
        let output = [];
        output.push(req.query.text);
        custom = req.query.text;

        result.forEach(function (item) {
            if (item.unitName === null) {
                item.unitName = 'Kilogramm';
            }
            if (amount > 1) {
                if (item.unitNamePlural == null) {
                    item.unitNamePlural = item.unitName;
                }
                output.push(amount + ' ' + item.unitNamePlural + ' ' + item.ingredientNamePlural);
            } else {
                output.push(amount + ' ' + item.unitName + ' ' + item.ingredientNameSingular);
            }
            querys.push('(listID, ingredientID, itemAmount, unitID) VALUES (' + req.query.id + ', ' + item.ingredientID + ', ' + amount + ', ' + item.unitID + ')');
            ids.push(item.ingredientID);
            type.push('ingredients');
            units.push(item.unitID);
        });

        let edekaquery = 'SELECT productID, productMarkenname, productArtikelbezeichnung, productAmount FROM edekaproducts ORDER BY productArtikelbezeichnung';
        let edekaitems = await connection.asyncquery(edekaquery);
        let optionsedekaitems = {
            shouldSort: true,
            threshold: 0.6,
            location: 0,
            distance: 100,
            maxPatternLength: 32,
            minMatchCharLength: 1,
            keys: [
                'productMarkenname',
                'productArtikelbezeichnung'
            ]
        };
        let edekasearch = new fuse(edekaitems, optionsedekaitems);
        let edekaresult = edekasearch.search(req.query.text);
        if (edekaresult.length === 0) {
            res.send('<div id="items"></div>');
            return;
        }

        if (edekaresult.length !== 0) {
            for (let i = 0; i < 10; i++) {
                if (edekaresult[i].productMarkenname === undefined || edekaresult[i].productMarkenname === null) {
                    edekaresult[i].productMarkenname = 'EDEKA';
                }
                if (edekaresult[i] !== undefined) {
                    if (edekaresult[i].productAmount === null) {
                        output.push(amount + ' ' + edekaresult[i].productArtikelbezeichnung + ' von ' + edekaresult[i].productMarkenname);
                    } else {
                        output.push(amount + ' ' + edekaresult[i].productArtikelbezeichnung + ' von ' + edekaresult[i].productMarkenname + ' (' + edekaresult[i].productAmount + ')');
                    }
                    querys.push('(listID, productID, itemAmount) VALUES (' + req.query.id + ', ' + edekaresult[i].productID + ', ' + amount + ')');
                    ids.push(edekaresult[i].productID);
                    type.push('edekaproducts');
                    units.push(0);
                }
            }
        }
        res.render('main.ejs', {custom: custom, items: output, itemsextrainfo: result, querys: querys, ids: ids, type: type, unitid: units, amount: amount});

    } catch (e) {
        console.log(e);
    }
});

app.post('/newlist', urlencodedparser, async function (req, res) {
    let customid = makeid(10);
    await connection.asyncquery('INSERT INTO lists (listName, userID, uniqueID) VALUES (\'' + req.body.listname + '\', ' + loggedInUsers[req.cookies.sessionToken] + ', \'' + customid + '\')');
    res.redirect('/lists');
});


function replace(string, substring, newstring) {
    while (string.includes(substring)) {
        string = string.replace(substring, newstring);
    }
    return string;
}

exports.replace = replace;

function editString(string) {
    string = replace(string, ' ', '%');
    string = replace(string, 'ö', 'oe');
    string = replace(string, 'Ö', 'Oe');
    string = replace(string, 'ü', 'ue');
    string = replace(string, 'Ü', 'Ue');
    string = replace(string, 'ä', 'ae');
    string = replace(string, 'Ä', 'Ae');
    string = replace(string, 'ß', 'ss');
    string = replace(string, '(', '%');
    string = replace(string, ')', '%');
    return string;
}

exports.editString = editString;

app.get('/getedekafinder', urlencodedparser, async function (req, res) {
    let query = 'SELECT * FROM shops order by abs(shopPlz - '+ req.query.plz +') Limit 10;';
    let result = await connection.asyncquery(query);
    let links = [];
    let streetname;
    let cityname;
    let postalcode;
    result.forEach(function (item, index) {
        let i = index;
        streetname = editString(result[i].shopStrasse);
        cityname = editString(result[i].shopOrt);
        postalcode = editString('' + result[i].shopPlz);
        let link = 'https://maps.google.com/?q=' + streetname + ',' + cityname + ',' + postalcode;
        links.push(link);
    });

    res.render('edekashopsoutput.ejs', {result: result, links: links});
});

app.get('/edekafinder', urlencodedparser, async function (req, res) {
    if (!logined(req, res)) {
        return
    }
    var ip = '206.81.23.52';
    let sharedlists = await connection.asyncquery('SELECT * FROM sharedLists left join lists on sharedLists.listID = lists.listID WHERE sharedLists.userID = ' + loggedInUsers[req.cookies.sessionToken]);
    let lists = await connection.asyncquery('SELECT * FROM lists WHERE userID = ' + loggedInUsers[req.cookies.sessionToken]);
    let user = await connection.asyncquery('SELECT * FROM user WHERE userID = '+ loggedInUsers[req.cookies.sessionToken]);
    res.render('shops.ejs', {user: user, lists: lists, sharedlists: sharedlists, plz: user[0].userAdress});
});

app.get('/adduser', urlencodedparser, async function (req, res) {
   let userid = await connection.asyncquery('SELECT * FROM user WHERE userName = \'' + req.query.username + '\'');
   let listid = req.query.listid;
   await connection.asyncquery('INSERT INTO sharedLists (userID, listID) VALUES ('+ userid[0].userID + ',' + listid +')');
   res.redirect('/onelist?id=' + listid);
});

app.get('/checkuser', urlencodedparser, async function (req, res) {
   let user = await connection.asyncquery('SELECT * FROM user WHERE userName = \'' + req.query.name + '\';');
   if (user[0] === undefined) {
       res.send('red');
   } else {
       res.send('green');
   }
});

app.get('/', function (req, res) {
    res.redirect('/login');
});

app.get('*', function (req, res) {
   res.redirect('/login');
});


app.listen(8000);
// module.exports = app;