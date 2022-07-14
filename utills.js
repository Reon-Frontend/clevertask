const fs = require("fs");
const logger = require("./logger");

const getFieldValue = (customFields, fieldId) => {
  const field = customFields
    ? customFields.find((item) => String(item.field_id || item.id) === String(fieldId))
    : undefined;
  const value = field ? field.values[0].value : undefined;
  return value;
};

const getFieldValues = (customFields, fieldId) => {
  const field = customFields
    ? customFields.find((item) => String(item.field_id || item.id) === String(fieldId))
    : undefined;
  const values = field ? field.values : [];
  return values.map(item => item.value);
};

const makeField = (field_id, value, enum_id) => {
  if (!value) {
    return undefined;
  }
  return {
    field_id,
    values: [
      {
        value,
        enum_id
      },
    ],
  };
};


//функция для разбиения запроса на создание на несколько по chunkSize
const bulkOperation = async (
  reqest,
  data,
  chunkSize,
  operationName = "bulk"
) => {
  let failed = [];
  if (data.length) {
    logger.debug(`Старт операции ${operationName}`);
    try {
      const chunksCount = data.length / chunkSize;
      for (let i = 0; i < chunksCount; i++) {
        try {
          const sliced = data.slice(i * chunkSize, (i + 1) * chunkSize);
          await reqest(sliced);
        } catch (e) {
          logger.error(e);
          failed.push(...data.slice(i * chunkSize, (i + 1) * chunkSize));
        }
        logger.debug(
          `${operationName} ${i * chunkSize} - ${(i + 1) * chunkSize}`
        );
      }
    } catch (e) {
      logger.error(e);
    }
  }
  logger.debug(
    `операция "${operationName}" завершена. Неуспешных - ${failed.length}`
  );
  fs.writeFileSync(`${operationName}Failed.txt`, JSON.stringify(failed));
};

const getAllPages = async (request, page = 1, limit = 200) => {
  try {
    console.log(`Загрузка страницы ${page}`);
    const res = await request({ page, limit });
    if (res.length === limit) {
      const next = await getAllPages(request, page + 1, limit);
      return [...res, ...next];
    }
    return res;
  } catch (e) {
    logger.error(e);
  }
};

module.exports = {
  getFieldValue,
  getFieldValues,
  makeField,
  bulkOperation,
  getAllPages
};