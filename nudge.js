#!/usr/bin/env node

"use strict";

var http = require("http"),
    querystring = require("querystring"),
    child_process = require("child_process");

function writeCSS(res) {
    res.writeHead(200, {
        "Content-Type": "text/css"
    });

    res.write("/* Move down content because we have a fixed navbar that is 50px tall */\n");
    res.write("body {\n\tpadding-top: 50px;\n\tpadding-bottom: 20px;\n}");
    res.end();
}

function beginPage(res, title) {
    res.write("<!DOCTYPE html>\n");
    res.write("<html lang='en'>\n");
    res.write("<head>\n");
    res.write("<meta charset='utf-8'>\n");
    res.write("<meta http-equiv='X-UA-Compatible' content='IE=edge'>\n");
    res.write("<meta name='viewport' content='width=device-width, initial-scale=1'>\n");
    res.write("<meta name='description' content=''>\n");
    res.write("<meta name='author' content=''>\n");
    res.write("<title>"+ title + "</title>\n");
    res.write("<link rel='stylesheet' href='style.css' type='text/css'>\n");
    res.write("<link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css' type='text/css'>\n");
    res.write("</head>\n");
    res.write("<body>\n");
    writeNav(res, title);
    res.write("<div class='jumbotron'>"); // Open Jumbotron for body.
    res.write("<div class='container'>"); // Open container for body.
}

function endPage(res) {
    res.write("<hr>");
    res.write("<footer>\n");
    res.write("<p>&copy; Nudge 2015</p>\n");
    res.write("</footer>\n");
    res.write("</div>"); // Close container for form and footer.
    res.write("</body>\n");
    res.write("</html>\n");
    res.end();
}

function writeNav(res, title) {
    res.write("<nav class='navbar navbar-inverse navbar-fixed-top'>\n");
    res.write("<div class='container'>\n");
    res.write("<div class='navbar-header'>\n");
    res.write("<a class='navbar-brand' href='#'>" + title + "</a>\n");
    res.write("</div>\n");
    res.write("</div>\n");
    res.write("</nav>\n");
}

function writeHeading(res, tag, title) {
    res.write("<" + tag + ">" + title + "</" + tag + ">\n");
}

function writePre(res, divClass, data) {
    var escaped = data.replace(/</, "&lt;").
                       replace(/>/, "&gt;");

    res.write("<div class='" + divClass + "_div'>\n");
    res.write("<pre class='jumbotron'>");
    res.write(escaped);
    res.write("</pre>\n");
    res.write("</div>\n");
}

function beginForm(res) {
    res.write("<div class='row'>\n");
    res.write("<form method='POST' action='/push'>\n");
}

function endForm(res) {
    res.write("<div class='col-md-4'>\n");
    res.write("<input class='btn btn-primary btn-lg' type='submit' value='Push'>\n");
    res.write("</div>"); // Close button column.
    res.write("</form>\n");
    res.write("</div>"); // Close row class.
}

function capitalize(str) {
    return str[0].toUpperCase() + str.slice(1);
}

function beginSelect(res, what) {
    res.write("<div class='" + what + "_div'>\n");
    res.write("<label for='" + what + "_select'>" + capitalize(what) + "</label>\n");
    res.write("<select id='" + what + "_select' name='" + what + "'>\n");
}

function writeOption(res, option) {
    res.write("<option value='" + option + "'>" + option + "</option>\n");
}

function endSelect(res) {
    res.write("</select>\n");
    res.write("</div>\n");
}

function gitRemote(res) {
    child_process.exec("git remote", function(err, stdout, stderr) {
        if (err) {
            writeHeading(res, "h2", "Error listing remotes");
            writePre(res, "error", stderr);
            endPage(res);
        } else {
            var output = stdout.toString(),
                remotes = output.split(/\n/);

            res.write("<div class='col-md-4'>\n"); // Open branch column class.
            beginSelect(res, "remote");

            remotes.forEach(function(remoteName) {
                if (remoteName) {
                    writeOption(res, remoteName);
                }
            });

            endSelect(res);
            res.write("</div>\n"); // Close branch column class.
            endForm(res);
            endPage(res);
        }
    });
}

function gitBranch(res) {
    child_process.exec("git branch", function(err, stdout, stderr) {
        if (err) {
            writeHeading(res, "h2", "Error listing branches");
            writePre(res, "error", stderr);
            endPage(res);
        } else {
            var output = stdout.toString(),
                branches = output.split(/\n/);

            res.write("<div class='container'>"); // Open container for form and footer.
            beginForm(res);
            res.write("<div class='col-md-4'>\n"); // Open branch column class.
            beginSelect(res, "branch");

            branches.forEach(function(branch) {
                var branchName = branch.replace(/^\s*\*?\s*/, "").
                                        replace(/\s*$/, "");

                if (branchName) {
                    writeOption(res, branchName);
                }
            });

            endSelect(res);
            res.write("</div>\n"); // Close branch column class.
            gitRemote(res);
        }
    });
}

function gitStatus(res) {
    child_process.exec("git status", function(err, stdout, stderr) {
        if (err) {
            writeHeading(res, "h2", "Error retrieving status");
            writePre(res, "error", stderr);
            endPage(res);
        } else {
            writeHeading(res, "h2", "Git Status");
            writePre(res, "status", stdout);
            res.write("</div>"); // Close container for body.
            res.write("</div>"); // Close jumbotron for body.
            gitBranch(res);
        }
    });
}

function gitPush(req, res) {
    var body = "";

    req.on("data", function(chunk) {
        body += chunk;
    });

    req.on("end", function () {
        var form = querystring.parse(body);

        child_process.exec("git push " + form.remote + " " + form.branch, function(err, stdout, stderr) {
            if (err) {
                writeHeading(res, "h2", "Error pushing repository");
                writePre(res, "error", stderr);
            } else {
                writeHeading(res, "h2", "Git Push");
                writePre(res, "push", stdout);
            }
            gitStatus(res);
        });
    });
}

function frontPage(req, res) {
    res.writeHead(200, {
        "Content-Type": "text/html"
    });

    if (req.url === "/style.css") {
        writeCSS(res);
    } else {
        var title = "Nudge - Web Interface for Git Push";

        beginPage(res, title);
        writeHeading(res, "h1", title);

        if (req.method === "POST" && req.url === "/push") {
            gitPush(req, res);
        } else {
            gitStatus(res);
        }
    }
}

var server = http.createServer(frontPage);
server.listen();
var address = server.address();
console.log("nudge is listening at http://localhost:" + address.port + "/");
