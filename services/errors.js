const success = (code,message,data) => {
    return {
        status:code,
        success: true,
        message: message,
        response: data,
    }
}

const error = (code,message,occureIn) => {
    return {
        status:code,
        success: false,
        message: message,
        occurredAT:occureIn
    }
}
module.exports = {success, error}