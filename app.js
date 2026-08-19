const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const { status } = require('http-status');
const cookieParser = require('cookie-parser');
const { jwtStrategy } = require('./config/passport');
const ApiError = require('./utils/ApiError');
const { errorConverter, errorHandler } = require('./middlewares/error');
const routes = require('./routes');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(xss());
app.use(mongoSanitize());
app.use(compression());
app.use(cors({
  origin: [
    'https://adwise-frontend-sand.vercel.app',
    'https://adwise.stacklyhub.com',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// Unauthenticated on purpose - used by the Docker healthcheck and any
// uptime/load-balancer probes, not part of the API surface itself.
app.get('/health', (req, res) => res.status(status.OK).send({ status: 'ok' }));

app.use('/', routes);

app.use((req, res, next) => {
  next(new ApiError(status.NOT_FOUND, 'Not found'));
});

app.use(errorConverter);
app.use(errorHandler);

module.exports = app;
