const moment = require("moment-timezone");

const getTimezoneWiseDate = (date) => {
    const parsedDate = moment.tz(date, "YYYY-MM-DD HH:mm", moment.tz.guess()); // Parse and treat the input as local time
    const unixTimestamp = parsedDate.utc().valueOf(); // Convert to UTC timestamp
    return unixTimestamp;
}

module.exports = {
    getTimezoneWiseDate
};
