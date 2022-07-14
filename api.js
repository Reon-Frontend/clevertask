const axios = require('axios')
const querystring = require('querystring')
const fs = require('fs')
const axiosRetry = require('axios-retry')

const config = require('./config')
const logger = require('./logger')

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay })

const LIMIT = 200

function Api(subDomain, authCode) {
  const AMO_TOKEN_PATH = `./authclients/${subDomain}_amo_token.json`
  let access_token = null
  let refresh_token = null
  this.subDomain = subDomain
  this.authCode = authCode
  const ROOT_PATH = `https://${subDomain}.amocrm.ru`

  const authChecker = (request) => {
    return (...args) => {
      if (!access_token) {
        return this.getAccessToken().then(() => authChecker(request)(...args))
      }
      return request(...args).catch((err) => {
        logger.error(err.response)
        logger.error(err)
        logger.error(err.response.data)
        const data = err.response.data
        if ('validation-errors' in data) {
          data['validation-errors'].forEach(({ errors }) =>
            logger.error(errors)
          )
          logger.error('args', JSON.stringify(args, null, 2))
        }
        if (data.status == 401 && data.title === 'Unauthorized') {
          logger.debug('Нужно обновить токен')
          return refreshToken().then(() => authChecker(request)(...args))
        }
        throw err
      })
    }
  }

  const requestAccessToken = async () => {
    return axios
      .post(`${ROOT_PATH}/oauth2/access_token`, {
        client_id: config.CLIENT_ID,
        client_secret: config.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: config.REDIRECT_URI,
      })
      .then((res) => {
        logger.debug('Свежий токен получен')
        return res.data
      })
      .catch((err) => {
        logger.error(err.response.data)
        throw err
      })
  }

  const getAccessToken = async () => {
    if (access_token) {
      return Promise.resolve(access_token)
    }
    try {
      const content = fs.readFileSync(AMO_TOKEN_PATH)
      const token = JSON.parse(content)
      access_token = token.access_token
      refresh_token = token.refresh_token
      return Promise.resolve(token)
    } catch (error) {
      logger.error(`Ошибка при чтении файла ${AMO_TOKEN_PATH}`, error)
      logger.debug('Попытка заново получить токен')
      const token = await requestAccessToken()
      fs.writeFileSync(AMO_TOKEN_PATH, JSON.stringify(token))
      access_token = token.access_token
      refresh_token = token.refresh_token
      return Promise.resolve(token)
    }
  }

  const refreshToken = async () => {
    return axios
      .post(`${ROOT_PATH}/oauth2/access_token`, {
        client_id: config.CLIENT_ID,
        client_secret: config.CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        redirect_uri: config.REDIRECT_URI,
      })
      .then((res) => {
        logger.debug('Токен успешно обновлен')
        const token = res.data
        fs.writeFileSync(AMO_TOKEN_PATH, JSON.stringify(token))
        access_token = token.access_token
        refresh_token = token.refresh_token
        return token
      })
      .catch((err) => {
        logger.error('Не удалось обновить токен')
        logger.error(err.response.data)
      })
  }

  const getAccountData = authChecker(() => {
    return axios
      .get(`${ROOT_PATH}/api/v4/account`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
      .then((res) => res.data)
  })

  this.getAccountData = getAccountData

  this.getAccessToken = getAccessToken

  this.getDeal = authChecker((id, withParam = []) => {
    return axios
      .get(
        `${ROOT_PATH}/api/v4/leads/${id}?${querystring.encode({
          with: withParam.join(','),
        })}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
      .then((res) => res.data)
  })
  this.getContact = authChecker((id) => {
    return axios
      .get(
        `${ROOT_PATH}/api/v4/contacts/${id}?${querystring.stringify({
          with: ['leads'],
        })}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
      .then((res) => res.data)
  })
  this.getCompany = authChecker((companyId) => {
    return axios
      .get(`${ROOT_PATH}/api/v4/companies/${companyId}`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
      .then((res) => res.data)
  })
  this.updateDeal = authChecker((id, data) => {
    return axios.patch(`${ROOT_PATH}/api/v4/leads/${id}`, data, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })
  })
}

module.exports = Api
