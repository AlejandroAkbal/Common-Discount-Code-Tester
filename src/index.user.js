// ==UserScript==
// @name            Common Discount Code Tester
// @namespace       AlejandroAkbal
// @version         0.1
// @description     -
// @author          Alejandro Akbal
// @icon            -
// @homepage        https://github.com/AlejandroAkbal/Common-Discount-Code-Tester/
// @downloadURL     https://raw.githubusercontent.com/AlejandroAkbal/Common-Discount-Code-Tester/main/src/photopea_ad_hide.user.js
// @updateURL       https://raw.githubusercontent.com/AlejandroAkbal/Common-Discount-Code-Tester/main/src/photopea_ad_hide.user.js
// @match           *://*/*
// @grant           none
// @run-at          document-start
// ==/UserScript==

(async function () {
    'use strict'

    const SITES = [
        {
            host: 'udemy.com',

            wait_between_checks: 1000,

            // Required
            price_selector: '[data-purpose="course-price-text"] > span:nth-child(2)',

            form_input_selector: '[data-purpose="coupon-input"]',
            form_submit_selector: '[data-purpose="coupon-submit"]',
            form_success_selector: '[data-purpose="code-text"]',

            // Optional
            form_open_selector: 'div.generic-purchase-section--ctas--1wqHF:nth-child(5) > div:nth-child(1) > div:nth-child(1) > div:nth-child(3) > div:nth-child(1) > button:nth-child(1)',
            form_cancel_selector: 'div.generic-purchase-section--ctas--1wqHF:nth-child(5) > div:nth-child(1) > div:nth-child(1) > div:nth-child(3) > p:nth-child(2) > button:nth-child(1)',
            form_error_selector: '[data-purpose="coupon-form-error"]',
        },
        {
            host: 'atersa.shop',

            wait_between_checks: 1000,

            price_selector: '.order-total > td:nth-child(2) > strong:nth-child(1) > span:nth-child(1) > bdi:nth-child(1)',

            form_input_selector: '#coupon_code',
            form_submit_selector: '[name="apply_coupon"]',
            form_success_selector: null,

            form_open_selector: '#coupon-trigger',
            form_cancel_selector: null,
            form_error_selector: '.woocommerce-error',
        }
    ]

    const SITE = SITES.find(site => window.location.hostname.includes(site.host));

    if (!SITE) {
        console.warn("Site not found");
        return;
    }

    // const COUPON_LIST_URL = "https://raw.githubusercontent.com/sbrws/FuzzCoupons/master/fuzzcoupons.txt";
    const COUPON_LIST_URL = "https://gist.githubusercontent.com/AlejandroAkbal/a1f6c8a55d3a9db9aa073141cfbec3a1/raw/discount-codes.txt";


    function fetchCouponList(url) {
        return fetch(url)
            .then(response => response.text())
            .then(text => text.split('\n'))
            .then(lines => lines.filter(line => line.length > 0))
    }

    const COUPON_LIST = [

        ...(await fetchCouponList(COUPON_LIST_URL)),
    ]

    const WORKING_COUPON_LIST = []

    let currentCouponIndex = 0

    function getCoupon() {
        return COUPON_LIST[currentCouponIndex]
    }

    function changeInputValue(input, value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
        )?.set;

        nativeInputValueSetter?.call(input, value);

        const inputEvent = new Event("input", { bubbles: true });

        input.dispatchEvent(inputEvent);
    }

    async function sleep(milliseconds = 2500) {
        await new Promise(resolve => setTimeout(resolve, milliseconds))
    }

    async function applyCoupon(coupon) {

        const FORM_INPUT = document.querySelector(SITE.form_input_selector)

        if (!FORM_INPUT) {
            console.warn("No form_input selector found")
            return
        }

        const FORM_SUBMIT = document.querySelector(SITE.form_submit_selector)

        if (!FORM_SUBMIT) {
            throw new Error("No form_submit element found")
        }

        changeInputValue(FORM_INPUT, coupon)

        FORM_SUBMIT.click()

        // wait for the form to be submitted
        await sleep();

        if (isCouponSuccessfullyApplied()) {
            console.info(`Coupon "${ coupon }" successfully applied`)
            WORKING_COUPON_LIST.push(coupon)
        }
    }

    function isCouponSuccessfullyApplied() {
        // TODO: Track price changes

        if (!SITE.form_success_selector) {
            return null
        }

        const couponSuccessEle = document.querySelector(SITE.form_success_selector)

        return !!couponSuccessEle;
    }

    function cancelCurrentCoupon() {
        if (!SITE.form_cancel_selector) {
            console.debug("No form cancel selector found")
            return
        }

        const FORM_CANCEL = document.querySelector(SITE.form_cancel_selector)

        if (!FORM_CANCEL) {
            console.debug("No form cancel found")
            return
        }

        FORM_CANCEL.click()
    }

    function openCouponForm() {

        if (!!document.querySelector(SITE.form_input_selector)) {
            console.debug("Form already open")
            return
        }

        if (!SITE.form_open_selector) {
            console.debug("No form open_selector found")
            return
        }

        const FORM_OPEN = document.querySelector(SITE.form_open_selector)

        if (!FORM_OPEN) {
            console.warn("No form open_element found")
            return
        }

        FORM_OPEN.click()
    }

    const ORIGINAL_PRICE = getCurrentPrice()

    function getCurrentPrice() {
        return document.querySelector(SITE.price_selector).innerText
    }

    function checkForPriceDifference(originalPrice, currentPrice) {
        return originalPrice !== currentPrice
    }

    console.log(`Original price: ${ ORIGINAL_PRICE }`)

    for (const COUPON of COUPON_LIST) {

        openCouponForm()

        await sleep(150)

        cancelCurrentCoupon()

        await sleep(350)

        await applyCoupon(COUPON)

        await sleep(2000)

        if (checkForPriceDifference(ORIGINAL_PRICE, getCurrentPrice())) {

            console.info(`COUPON "${ COUPON }" price: "${ getCurrentPrice() }"`)
        }

        currentCouponIndex++

        await sleep(SITE.wait_between_checks)
    }

    console.log(WORKING_COUPON_LIST)
})();

