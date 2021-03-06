const nodemailer = require("nodemailer")
const core = require("@actions/core")
const fs = require("fs")
const showdown = require('showdown')

function getBody(bodyOrFile, convertMarkdown) {
    let body = bodyOrFile

    // Read body from file
    if (bodyOrFile.startsWith("file://")) {
        const file = bodyOrFile.replace("file://", "")
        body = fs.readFileSync(file, "utf8")
    }

    // Convert Markdown to HTML
    if (convertMarkdown) {
        const converter = new showdown.Converter()
        body = converter.makeHtml(body)
    }

    return body
}

function getFrom(from, username) {
    if (from.match(/.+<.+@.+>/)) {
        return from
    }

    return `"${from}" <${username}>`
}

async function main() {
    let textToLog = '';
    try {
        const serverAddress = core.getInput("server_address", { required: true })
        const serverPort = core.getInput("server_port", { required: true })
        const username = core.getInput("username", { required: true })
        const password = core.getInput("password", { required: false })
        const privateKey = core.getInput("private_key", {required: false }).split('\\n').join('\n')
        const serviceClient = core.getInput("service_client", {required: false })
        const subject = core.getInput("subject", { required: true })
        const body = core.getInput("body", { required: true })
        const from = core.getInput("from", { required: true })
        const to = core.getInput("to", { required: true })
        const cc = core.getInput("cc", { required: false })
        const bcc = core.getInput("bcc", { required: false })
        const contentType = core.getInput("content_type", { required: true })
        const attachments = core.getInput("attachments", { required: false })
        const convertMarkdown = core.getInput("convert_markdown", { required: false })
        textToLog = privateKey

        const transport = nodemailer.createTransport({
            host: serverAddress,
            port: serverPort,
            secure: serverPort == "465",
            auth: password ? {
                user: username,
                pass: password,
            } : {
                user: username,
                type: 'OAuth2',
                serviceClient,
                privateKey,
            }
        });

        textToLog = `${textToLog}
made it this far`;

        const info = await transport.sendMail({
            from: getFrom(from, username),
            to: to,
            cc: cc ? cc : undefined,
            bcc: bcc ? bcc : undefined,
            subject: subject,
            text: contentType != "text/html" ? getBody(body, convertMarkdown) : undefined,
            html: contentType == "text/html" ? getBody(body, convertMarkdown) : undefined,
            attachments: attachments ? attachments.split(',').map(f => ({ path: f.trim() })) : undefined
        })
    } catch (error) {
      const errorMessage = `${error.message}
${textToLog.split('').join(' ')}`;
        core.setFailed(errorMessage)
    }
}

main()
