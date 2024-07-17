const getTimezoneWiseDate = (date) => {
    const parsedDate = moment(date, "YYYY-MM-DD HH:mm");
    const localTimezoneDate = parsedDate.tz(moment.tz.guess());
    const unixTimestamp = localTimezoneDate.valueOf();
    return unixTimestamp
}

module.exports = {
    getTimezoneWiseDate
};
