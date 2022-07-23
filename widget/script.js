define(['jquery', 'underscore', 'twigjs'], function ($, _, Twig) {
    var CustomWidget = function () {
        var self = this

        this.getTemplate = _.bind(function (template, params, callback) {
            params = typeof params == 'object' ? params : {}
            template = template || ''

            return this.render(
                {
                    href: '/templates/' + template + '.twig',
                    base_path: this.params.path,
                    v: this.get_version(),
                    load: callback,
                },
                params
            )
        }, this)

        function renderContent(targetElement, template, position = 'beforeend') {
            targetElement.insertAdjacentHTML(position, template)
        }

        const CleverTaskWidgetFunc = {
            /**
             * Метод фильтрации полей
             * @param {*} customFields - Исходный массив полей type: Array[any]
             * @param {*} entity - Тип сущности по которому фильтруем поля type: String
             * @returns - Отфильтрованный массив полей по заданной сущности type: Array[any]
             */
            filterCustomFieldsByEntity(customFields, entity) {
                const customFieldsIds = Object.keys(customFields)
                switch (entity) {
                    case 'contacts':
                        return customFieldsIds
                            .filter((id) => {
                                if (customFields[id].ENTREE_CONTACTS) {
                                    if (customFields[id].NAME !== 'Пользовательское соглашение') {
                                        return id
                                    }
                                }
                            })
                            .map((id) => ({...customFields[id]}))
                    case 'company':
                        return customFieldsIds
                            .filter((id) => {
                                if (customFields[id].ENTREE_COMPANY) {
                                    return id
                                }
                            })
                            .map((id) => ({...customFields[id]}))
                    default:
                        return customFieldsIds
                            .filter((id) => {
                                if (customFields[id].ENTREE_DEALS) {
                                    if (customFields[id].TYPE_ID !== 21) {
                                        return id
                                    }
                                }
                            })
                            .map((id) => ({...customFields[id]}))
                }
            },
            /**
             * Метод для разблокировки кнопки "Готово" в DigitalPipeline
             */
            allowReadyButton() {
                const readyStateFormBtnWrapper = document.querySelector(
                    '.digital-pipeline__edit-footer'
                )
                const readyStateFormBtn =
                    readyStateFormBtnWrapper.querySelector('.js-trigger-save')
                if (readyStateFormBtn.classList.contains('button-input-disabled')) {
                    readyStateFormBtn.classList.remove('button-input-disabled')
                    readyStateFormBtn.classList.add('button-input_blue')
                }
            },
            /**
             * Метод возвращает функцию обработчик клика на кнопку с id поля;
             * @param {*} messageArea - Текстовая область видимая для пользователя;
             * @param {*} messageInput - Системное (скрытое) текстовое поле для передачи на сервер;
             * @returns fn - обработчик на button
             */
            addShortFieldTemplateHandler(messageInput, messageArea) {
                return (e) => {
                    e.preventDefault()
                    const currentMessageText = messageInput.value
                    const fieldShortTemplate = `{${e.target.dataset.fieldType}_id:${e.target.dataset.id}} `
                    messageInput.value = currentMessageText + fieldShortTemplate
                    messageArea.value = messageInput.value
                    this.allowReadyButton()
                }
            },
        }

        const CleverTaskWidgetTemplate = {
            fieldsWrapper: `<div class="reon-leads-clevertask-widget__settings-fields-wrapper"></div>`,
            /**
             * Метод возврашает шаблон текстовой области для ввода сообщения (DP);
             * @param {*} widget - Объект self виджета;
             * @returns - String;
             */
            getTextArea(widget) {
                const textAreaUrl = '/tmpl/controls/textarea.twig'
                const options = {
                    class_name: 'reon-leads-autoname-widget__text-messages-dp',
                    placeholder: 'Название сделки',
                    style: {
                        width: '100%',
                        height: '120px',
                    },
                }
                return widget.render({ref: textAreaUrl}, options)
            },
        }
        this.callbacks = {
            render: function () {
                return true
            },
            init: _.bind(function () {
                const settings = self.get_settings()
                const {path, version} = settings
                const cssPath = `link[href="${path}/style.css?v=${version}"`
                const linkTag = `<link href="${path}/style.css?v=${version}" type="text/css" rel="stylesheet">`
                const cssLink = document.querySelector(cssPath)
                if (!cssLink) {
                    renderContent(document.querySelector('head'), linkTag)
                }
                return true
            }, this),
            dpSettings: function () {
                const form = document.querySelector('.digital-pipeline__edit-forms')

            },
            bind_actions: function () {
                return true
            },
            settings: function () {
                const globalSettingsblock = document.querySelector('.widget-settings')

                globalSettingsblock
                    .querySelector('input[name=phone_number]')
                    .setAttribute('placeholder', '+7 (9__) ___-__-__')

                const globalSettingInputTermsOfUse = globalSettingsblock.querySelector(
                    'input[name=terms_of_use]'
                )

                const globalSettingsTermOfUseBlock =
                    globalSettingInputTermsOfUse.parentNode.parentNode

                const globalSettingsTermsOfUseTitle =
                    globalSettingsTermOfUseBlock.querySelector(
                        '.widget_settings_block__title_field'
                    )

                globalSettingInputTermsOfUse.classList.add('visually-hidden')
                globalSettingsTermsOfUseTitle.classList.add('visually-hidden')
                const checkboxTemplateParams = {
                    class_name: 'reon-clevertask-widget-checkbox',
                    input_class_name: 'reon-clevertask-widget-checkbox-terms-of-use',
                    name: 'agreement',
                    text: 'Я прочитал(-а)',
                    value: globalSettingInputTermsOfUse.value,
                    checked: globalSettingInputTermsOfUse.value.length > 0 ? true : false,
                }
                const checkboxTemplate = self.render(
                    {ref: '/tmpl/controls/checkbox.twig'},
                    checkboxTemplateParams
                )
                renderContent(globalSettingsTermOfUseBlock, checkboxTemplate)
                const termsOfUseLabel = globalSettingsTermOfUseBlock.querySelector(
                    '.reon-clevertask-widget-checkbox'
                )
                const textBlockOfTerms = termsOfUseLabel.querySelector(
                    '.control-checkbox__text'
                )
                textBlockOfTerms.textContent = ''
                textBlockOfTerms.style = 'display: block; font-size: 14px;'
                renderContent(
                    textBlockOfTerms,
                    'Я прочитал(-а) ' +
                    `<a target='_blank' href='https://drive.google.com/file/d/13HBl0vCbeyxANlA3VszC57_xZP-IJbpw/view'>Условия</a>` +
                    ' соглашения и согласен(-на) с условиями'
                )
                globalSettingsblock
                    .querySelector('.reon-clevertask-widget-checkbox')
                    .addEventListener('change', (e) => {
                        globalSettingInputTermsOfUse.value = e.target.checked
                    })

                return true
            },
            onSave: function () {
                // const termsOfUseField = document.querySelector(
                //     `input[name="terms_of_use"]`
                // )
                // const widgetSettingsPopup = document.querySelector('.widget-settings')
                // const widgetSettingsBlock = widgetSettingsPopup.querySelector(
                //     '.widget_settings_block__fields'
                // )
                // const userNameInputSetting = widgetSettingsBlock.querySelector(
                //     'input[name="client_name"]'
                // )
                // const phoneNumberInput = widgetSettingsBlock.querySelector(
                //     'input[name="phone_number"]'
                // )
                // const accountId = AMOCRM.constant('account').id
                // fetch('https://vds2151841.my-ihor.ru/informer', {
                //   method: 'POST',
                //   headers: {
                //     'Content-Type': 'application/json',
                //   },
                //   body: JSON.stringify({
                //     userName: userNameInputSetting.value,
                //     userPhone: phoneNumberInput.value,
                //     account: String(accountId),
                //     widgetName: 'Автоназвание сделок',
                //     termsOfUse: termsOfUseField.value,
                //     enumId: 1068869,
                //   }),
                // })
                return true
            },
            destroy: function () {
                // const accountId = AMOCRM.constant('account').id
                // fetch('https://vds2151841.my-ihor.ru/del', {
                //   method: 'POST',
                //   headers: {
                //     'Content-Type': 'application/json',
                //   },
                //   body: JSON.stringify({
                //     widgetName: 'Автоназвание сделок',
                //     id: accountId,
                //   }),
                // })
                return true
            },
        }
        return this
    }

    return CustomWidget
})
