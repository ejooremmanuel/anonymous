module.exports = (req, res, next) => {
    const { user } = req;

    if (!user) {
        req.flash('error-message', '<b>Error:</b> You are not logged in! Please Log in to continue.')
        return res.redirect('/user/login');
    }
    next();
}