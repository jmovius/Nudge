#!/usr/bin/env node

"use strict";

var http = require("http"),
    querystring = require("querystring"),
    child_process = require("child_process");

function beginPage(res) {
    res.write("<!DOCTYPE html>\n");
    res.write("<html lang='en'>\n");
    res.write("<head>\n");
    res.write("<meta charset='utf-8'>\n");
    res.write("<title>Nudge - Web Interface for Git Push</title>\n");
    res.write("</head>\n");
    res.write("<body>\n");
}

function endPage(res) {
    res.write("</body>\n");
    res.write("</html>\n");
    res.end();
}

function writePre(res, divClass, data) {

    res.write("<div class='" + divClass + "'>\n");
    res.write("<pre>");
    res.write(data);
    res.write("</pre>\n");
    res.write("</div>\n");
}

function beginForm(res) {
    res.write("<form method='POST', action='/push'>\n");
}

function endForm(res) {
    res.write("<input type='submit' value='Push'>\n");
    res.write("</form>\n");
}

function beginSelect(res, what) {
    res.write("<div class='" + what + "'>\n");
    res.write("<select name='" + what + "'>\n");
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
            writePre(res, "error", stderr);
            endPage(res);
        } else {
            var output = stdout.toString(),
                remotes = output.split(/\n/);

            beginSelect(res, "remote");

            remotes.forEach(function(remoteName) {
                if (remoteName) {
                    writeOption(res, remoteName);
                }
            });

            endSelect(res);
            endForm(res);
            endPage(res);
        }
    });
}

function gitBranch(res) {
    child_process.exec("git branch", function(err, stdout, stderr) {
        if (err) {
            writePre(res, "error", stderr);
            endPage(res);
        } else {
            var output = stdout.toString(),
                branches = output.split(/\n/);

            beginForm(res);
            beginSelect(res, "branch");

            branches.forEach(function(branch) {
                var branchName = branch.replace(/^\s*\*?\s*/, "").
                                        replace(/\s*$/, "");

                if (branchName) {
                    writeOption(res, branchName);
                }
            });

            endSelect(res);
            gitRemote(res);
        }
    });
}

function gitStatus(res) {
    child_process.exec("git status", function(err, stdout, stderr) {
        if (err) {
            writePre(res, "error", stderr);
            endPage(res);
        } else {
            writePre(res, "status", stdout);
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
                writePre(res, "error", stderr);
            } else {
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

    beginPage(res);

    if (req.method === "POST" && req.url === "/push") {
        gitPush(req, res);
    } else {
        gitStatus(res);
    }
}

var server = http.createServer(frontPage);
server.listen(8000);
var address = server.address();
console.log("nudge is listening at http://localhost:" + address.port + "/");

