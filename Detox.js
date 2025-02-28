const recorder = require('codeceptjs').recorder;
const path = require('path');

let detox;
let by;
let element;
let expect;
let waitFor;

/**
 * This is a wrapper on top of [Detox](https://github.com/wix/Detox) library, aimied to unify testing experience for CodeceptJS framework.
 * Detox provides a grey box testing for mobile applications, playing especially good for React Native apps.
 * 
 * Detox plays quite differently from Appium. To establish detox testing you need to build a mobile application in a special way to inject Detox code.
 * This why **Detox is grey box testing** solution, so you need an access to application source code, and a way to build and execute it on emulator.
 * 
 * Comparing to Appium, Detox runs faster and more stable but requires an additional setup for build.
 * 
 * ### Setup
 * 
 * 1. [Install and configure Detox for iOS](https://github.com/wix/Detox/blob/master/docs/Introduction.GettingStarted.md) and [Android](https://github.com/wix/Detox/blob/master/docs/Introduction.Android.md)
 * 2. [Build an application](https://github.com/wix/Detox/blob/master/docs/Introduction.GettingStarted.md#step-4-build-your-app-and-run-detox-tests) using `detox build` command.
 * 3. Install [CodeceptJS](https://codecept.io) and detox-helper: 
 * 
 * ```
 * npm i @codeceptjs/detox-helper --save
 * ```
 * 
 * Detox configuration is required in `package.json` under `detox` section.
 * 
 * If you completed step 1 and step 2 you should have a configuration similar this:
 * 
 * ```js
 *  "detox": {
 *    "configurations": {
 *      "ios.sim.debug": {
 *        "binaryPath": "ios/build/Build/Products/Debug-iphonesimulator/example.app",
 *        "build": "xcodebuild -project ios/example.xcodeproj -scheme example -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
 *        "type": "ios.simulator",
 *        "name": "iPhone 7"
 *      }
 *    }
 *  }
 * ```
 * 
 * 
 * ### Configuration
 * 
 * Besides Detox configuration, CodeceptJS should also be configured to use Detox.
 * 
 * In `codecept.conf.js` enable Detox helper:
 * 
 * ```js
 * helpers: {
 *    Detox: {
 *      require: '@codeceptjs/detox-helper',
 *      configuration: '<detox-configuration-name>', 
 *    }   
 * }
 * 
 * ```
 * 
 * It's important to specify a package name under `require` section and current detox configuration taken from `package.json`.
 * 
 * Options:
 * 
 * * `configuration` - a detox configuration name. Required.
 * * `reloadReactNative` - should be enabled for React Native applications.
 * * `reuse` - reuse application for tests. By default, Detox reinstalls and relaunches app.
 * * `registerGlobals` - (default: true) Register Detox helper functions `by`, `element`, `expect`, `waitFor` globally.
 * 
 */
class Detox extends Helper {

  constructor(config) {
    super(config);
    this._setConfig(config);
    this._registerOptions();

    detox = require('detox');
    this.device = detox.device;
    this._useDetoxFunctions();
  }

  _registerOptions() {
    if (this.options.configuration && process.argv.indexOf('--configuration') < 0) {
      process.argv.push('--configuration');
      process.argv.push(this.options.configuration);
    }
    if (!process.argv.indexOf('--artifacts-location') < 0) {
      process.argv.push('--artifacts-location');
      process.argv.push(global.output_dir + '/');
    }
  }

  _useDetoxFunctions() {
    by = detox.by;
    element = detox.element;
    expect = detox.expect;
    waitFor = detox.waitFor;

    if (this.options.registerGlobals) {
      global.by = by
      global.element = element
      global.expect = expect
      global.waitFor = waitFor
    }
  }

  _validateConfig(config) {
    const defaults = {
      launchApp: true,
      reuse: false,
      reloadReactNative: false,
    };

    const detoxConf = require(path.join(global.codecept_dir, 'package.json')).detox;

    return Object.assign(defaults, detoxConf, config);
  }


  static _checkRequirements() {
    try {
      require('detox');
    } catch (e) {
      return ['detox@^12'];
    }
  }

  async _beforeSuite() {
    const { reuse, launchApp } = this.options;
    await detox.init(this.options, { reuse, launchApp });

    if (this.options.reloadReactNative) {
      return this.device.launchApp({ newInstance: true });
    }
  }

  async _afterSuite() {
    await detox.cleanup();
  }

  async _before(test) {
    if (this.options.reloadReactNative) {
      await this.device.reloadReactNative();
    } else {
      await this.device.launchApp({ newInstance: true });
    }
  }

  /**
  * Saves a screenshot to the output dir
  * 
  * ```js
  * I.saveScreenshot('main-window.png');
  * ```
  * 
  * @param {string} name 
  */
  async saveScreenshot(name) {
    return this.device.takeScreenshot(name);
  }

  async _test(test) {
    await detox.beforeEach({
      title: test.title,
      fullName: test.fullTitle(),
      status: 'running',
    });
  }

  async _passed(test) {
    await detox.afterEach({
      title: test.title,
      fullName: test.fullTitle(),
      status: 'passed',
    });
  }

  async _failed(test) {
    await detox.afterEach({
      title: test.title,
      fullName: test.fullTitle(),
      status: 'failed',
    });
  }

  async _locate(locator) {
    return element(this._detectLocator(locator, 'type'));
  }

  async _locateClickable(locator) {
    return element(this._detectLocator(locator, 'type'));
  }

  /**
  * Relaunches an application.
  * 
  * ```js
  * I.relaunchApp();
  * ```
  */
  async relaunchApp() {
    return this.device.launchApp({ newInstance: true });
  }

  /**
  * Launches an application. If application instance already exists, use [relaunchApp](#relaunchApp).
  * 
  * ```js
  * I.launchApp();
  * ```
  */
  async launchApp() {
    return this.device.launchApp({ newInstance: false });
  }

  /**
  * Installs a configured application.
  * Application is installed by default.
  * 
  * ```js
  * I.installApp();
  * ```
  */
  async installApp() {
    return this.device.installApp();
  }

  /**
   * Shakes the device.
   * 
   * ```js
   * I.shakeDevice();
   * ```
   */
  async shakeDevice() {
    await this.device.shake();
  }

  /**
  * Goes back on Android
  * 
  * ```js
  * I.goBack(); // on Android only
  * ```
  */
  async goBack() {
    await this.device.pressBack();
  }

  /**
  * Switches device to landscape orientation
  * 
  * ```js
  * I.setLandscapeOrientation();
  * ```
  */
  async setLandscapeOrientation() {
    await this.device.setOrientation('landscape');
  }

  /**
   * Switches device to portrait orientation
   * 
   * ```js
   * I.setPortraitOrientation();
   * ```
   */
  async setPortraitOrientation() {
    await this.device.setOrientation('portrait');
  }

  /**
   * Execute code only on iOS
   *
   * ```js
   * I.runOnIOS(() => {
    *    I.click('Button');
    *    I.see('Hi, IOS');
    * });
    * ```
    * @param {Function} fn a function which will be executed on iOS
    */
  async runOnIOS(fn) {
    if (device.getPlatform() !== 'ios') return;
    recorder.session.start('iOS-only actions');
    fn();
    recorder.add('restore from iOS session', () => recorder.session.restore());
    return recorder.promise();
  }


  /**
   * Execute code only on Android
   *
   * ```js
   * I.runOnAndroid(() => {
    *    I.click('Button');
    *    I.see('Hi, Android');
    * });
    * ```
    * @param {Function} fn a function which will be executed on android
    */
  async runOnAndroid(fn) {
    if (device.getPlatform() !== 'android') return;
    recorder.session.start('Android-only actions');
    fn();
    recorder.add('restore from Android session', () => recorder.session.restore());
    return recorder.promise();
  }


  /**
   * Taps on an element. 
   * Element can be located by its text or id or accessibility id.
   * 
   * The second parameter is a context element to narrow the search.
   * 
   * Same as [click](#click)
   * 
   * ```js
   * I.tap('Login'); // locate by text
   * I.tap('~nav-1'); // locate by accessibility label
   * I.tap('#user'); // locate by id
   * I.tap('Login', '#nav'); // locate by text inside #nav
   * I.tap({ ios: 'Save', android: 'SAVE' }, '#main'); // different texts on iOS and Android
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator 
   * @param {CodeceptJS.LocatorOrString | null} [context=null] 
   */
  tap(locator, context = null) {
    return this.click(locator, context);
  }

  /**
   * Multi taps on an element.
   * Element can be located by its text or id or accessibility id.
   * 
   * Set the number of taps in second argument.
   * Optionally define the context element by third argument.
   * 
   * ```js
   * I.multiTap('Login', 2); // locate by text
   * I.multiTap('~nav', 2); // locate by accessibility label
   * I.multiTap('#user', 2); // locate by id
   * I.multiTap('Update', 2, '#menu'); // locate by id
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator element to locate
   * @param {number} num number of taps 
   * @param {CodeceptJS.LocatorOrString | null} [context=null] context element
   */
  async multiTap(locator, num, context = null) {
    locator = this._detectLocator(locator, 'text');
    if (context) locator = this._detectLocator(context).withDescendant(locator);
    await element(locator).multiTap(num);
  }

  /**
   * Taps an element and holds for a requested time.
   * 
   * ```js
   * I.longPress('Login', 2); // locate by text, hold for 2 seconds
   * I.longPress('~nav', 1); // locate by accessibility label, hold for second
   * I.longPress('Update', 2, '#menu'); // locate by text inside #menu, hold for 2 seconds
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator element to locate
   * @param {number} sec number of seconds to hold tap
   * @param {CodeceptJS.LocatorOrString | null} [context=null] context element 
   */
  async longPress(locator, sec, context = null) {
    locator = this._detectLocator(locator, 'text');
    if (context) locator = this._detectLocator(context).withDescendant(locator);
    await element(locator).longPress(sec * 1000);
  }


  /**
   * Clicks on an element. 
   * Element can be located by its text or id or accessibility id
   * 
   * The second parameter is a context (id | type | accessibility id) to narrow the search.
   * 
   * Same as [tap](#tap)
   * 
   * ```js
   * I.click('Login'); // locate by text
   * I.click('~nav-1'); // locate by accessibility label
   * I.click('#user'); // locate by id
   * I.click('Login', '#nav'); // locate by text inside #nav
   * I.click({ ios: 'Save', android: 'SAVE' }, '#main'); // different texts on iOS and Android
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator 
   * @param {CodeceptJS.LocatorOrString | null} [context=null] 
   */
  async click(locator, context = null) {
    locator = this._detectLocator(locator, 'text');
    if (context) locator = this._detectLocator(context).withDescendant(locator);
    await element(locator).tap();
  }

  /**
  * Performs click on element with horizontal and vertical offset.
  * An element is located by text, id, accessibility id.
  * 
  * ```js
  * I.clickAtPoint('Save', 10, 10);
  * I.clickAtPoint('~save', 10, 10); // locate by accessibility id
  * ```
  * 
  * @param {CodeceptJS.LocatorOrString} locator
  * @param {number} [x=0] horizontal offset
  * @param {number} [y=0] vertical offset
  */
  async clickAtPoint(locator, x = 0, y = 0) {
    await element(this._detectLocator(locator, 'text')).tapAtPoint({ x, y });
  }

  /**
   * Checks text to be visible.
   * Use second parameter to narrow down the search.
   * 
   * ```js
   * I.see('Record created');
   * I.see('Record updated', '#message');
   * I.see('Record deleted', '~message');
   * ```
   * 
   * @param {string} text to check visibility
   * @param {CodeceptJS.LocatorOrString | null} [context=null] element inside which to search for text 
   */
  see(text, context = null) {
    if (context) {
      return expect(element(this._detectLocator(context))).toHaveText(text);
    }
    return expect(element(by.text(text))).toExist();
  }

  /**
   * Checks text not to be visible.
   * Use second parameter to narrow down the search.
   * 
   * ```js
   * I.dontSee('Record created');
   * I.dontSee('Record updated', '#message');
   * I.dontSee('Record deleted', '~message');
   * ```
   * @param {string} text to check invisibility
   * @param {CodeceptJS.LocatorOrString | null} [context=null] element in which to search for text
   */
  dontSee(text, context = null) {
    let locator = by.text(text);
    if (context) locator = this._detectLocator(context).withDescendant(locator);
    return expect(element(locator)).toBeNotVisible();
  }

  /**
   * Checks for visibility of an element.
   * Use second parameter to narrow down the search.
   * 
   * ```js
   * I.seeElement('~edit'); // located by accessibility id
   * I.seeElement('~edit', '#menu'); // element inside #menu
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator element to locate 
   * @param {CodeceptJS.LocatorOrString | null} [context=null] context element
   */
  seeElement(locator, context = null) {
    locator = this._detectLocator(locator);
    if (context) locator = this._detectLocator(context).withDescendant(locator);
    return expect(element(locator)).toBeVisible();
  }


  /**
   * Checks that element is not visible.
   * Use second parameter to narrow down the search.
   * 
   * ```js
   * I.dontSeeElement('~edit'); // located by accessibility id
   * I.dontSeeElement('~edit', '#menu'); // element inside #menu
   * ```
   * @param {CodeceptJS.LocatorOrString} locator element to locate
   * @param {CodeceptJS.LocatorOrString | null} [context=null] context element
   */
  dontSeeElement(locator, context = null) {
    locator = this._detectLocator(locator);
    if (context) locator = this._detectLocator(context).withDescendant(locator);
    return expect(element(locator)).toBeNotVisible();
  }

  /**
   * Checks for existence of an element. An element can be visible or not.
   * Use second parameter to narrow down the search.
   * 
   * ```js
   * I.seeElementExists('~edit'); // located by accessibility id
   * I.seeElementExists('~edit', '#menu'); // element inside #menu
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator element to locate 
   * @param {CodeceptJS.LocatorOrString} [context=null]  context element
   */
  seeElementExists(locator, context = null) {
    locator = this._detectLocator(locator);
    if (context) locator = this._detectLocator(context).withDescendant(locator);
    return expect(element(locator)).toExist();
  }

  /**
   * Checks that element not exists.
   * Use second parameter to narrow down the search.
   * 
   * ```js
   * I.dontSeeElementExist('~edit'); // located by accessibility id
   * I.dontSeeElementExist('~edit', '#menu'); // element inside #menu
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator element to locate 
   * @param {CodeceptJS.LocatorOrString} [context=null] context element
   */
  dontSeeElementExists(locator, context = null) {
    locator = this._detectLocator(locator);
    if (context) locator = this._detectLocator(context).withDescendant(locator);
    return expect(element(locator)).toNotExist();
  }

  /**
   * Fills in text field in an app.
   * A field can be located by text, accessibility id, id.
   * 
   * ```js
   * I.fillField('Username', 'davert');
   * I.fillField('~name', 'davert');
   * I.fillField({ android: 'NAME', ios: 'name' }, 'davert');
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} field an input element to fill in
   * @param {string} value value to fill 
   */
  async fillField(field, value) {
    const locator = this._detectLocator(field, 'text');
    await element(locator).tap();
    await element(locator).replaceText(value);
  }

  /**
   * Clears a text field.
   * A field can be located by text, accessibility id, id.
   * 
   * ```js
   * I.clearField('~name');
   * ``` 
   * 
   * @param {CodeceptJS.LocatorOrString} field an input element to clear
   */
  async clearField(field) {
    const locator = this._detectLocator(field, 'text');
    await element(locator).tap();
    await element(locator).clearText();
  }

  /**
   * Appends text into the field.
   * A field can be located by text, accessibility id, id.
   * 
   * ```js
   * I.appendField('name', 'davert');
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} field 
   * @param {string} value 
   */
  async appendField(field, value) {
    const locator = this._detectLocator(field, 'text');
    await element(locator).tap();
    await element(locator).typeText(value);
  }

  /**
   * Scrolls to the top of an element.
   * 
   * ```js
   * I.scrollUp('#container');
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator 
   */
  async scrollUp(locator) {
    await element(this._detectLocator(locator)).scrollTo('top');
  }

  /**
   * Scrolls to the bottom of an element.
   * 
   * ```js
   * I.scrollDown('#container');
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator 
   */
  async scrollDown(locator) {
    await element(this._detectLocator(locator)).scrollTo('bottom');
  }

  /**
   * Scrolls to the left of an element.
   * 
   * ```js
   * I.scrollLeft('#container');
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator 
   */
  async scrollLeft(locator) {
    await element(this._detectLocator(locator)).scrollTo('left');
  }


  /**
   * Scrolls to the right of an element.
   * 
   * ```js
   * I.scrollRight('#container');
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator 
   */
  async scrollRight(locator) {
    await element(this._detectLocator(locator)).scrollTo('right');
  }


  /**
   * Performs a swipe up inside an element.
   * Can be `slow` or `fast` swipe.
   * 
   * ```js
   * I.swipeUp('#container');
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator an element on which to perform swipe
   * @param {string} [speed='slow'] a speed to perform: `slow` or `fast`.
   */
  async swipeUp(locator, speed = 'slow') {
    await element(this._detectLocator(locator)).swipe('up', speed);
  }


  /**
   * Performs a swipe up inside an element.
   * Can be `slow` or `fast` swipe.
   * 
   * ```js
   * I.swipeUp('#container');
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator an element on which to perform swipe
   * @param {string} [speed='slow'] a speed to perform: `slow` or `fast`.
   */
  async swipeDown(locator, speed = 'slow') {
    await element(this._detectLocator(locator)).swipe('down', speed);
  }


  /**
   * Performs a swipe up inside an element.
   * Can be `slow` or `fast` swipe.
   * 
   * ```js
   * I.swipeUp('#container');
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator an element on which to perform swipe
   * @param {string} [speed='slow'] a speed to perform: `slow` or `fast`.
   */
  async swipeLeft(locator, speed = 'slow') {
    await element(this._detectLocator(locator)).swipe('left', speed);
  }


  /**
   * Performs a swipe up inside an element.
   * Can be `slow` or `fast` swipe.
   * 
   * ```js
   * I.swipeUp('#container');
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator an element on which to perform swipe
   * @param {string} [speed='slow'] a speed to perform: `slow` or `fast`.
   */
  async swipeRight(locator, speed = 'slow') {
    await element(this._detectLocator(locator)).swipe('right', speed);
  }

  /**
   * Waits for number of seconds
   * 
   * ```js
   * I.wait(2); // waits for 2 seconds
   * ```
   * 
   * @param {number} sec number of seconds to wait
   */
  async wait(sec) {
    return new Promise(((done) => {
      setTimeout(done, sec * 1000);
    }));
  }

  /**
   * Waits for an element to exist on page.
   * 
   * ```js
   * I.waitForElement('#message', 1); // wait for 1 second
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator an element to wait for
   * @param {number} [sec=5] number of seconds to wait, 5 by default
   */
  async waitForElement(locator, sec = 5) {
    return waitFor(element(this._detectLocator(locator))).toExist().withTimeout(sec * 1000);
  }

  /**
   * Waits for an element to be visible on page.
   * 
   * ```js
   * I.waitForElementVisible('#message', 1); // wait for 1 second
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator an element to wait for
   * @param {number} [sec=5] number of seconds to wait
   */
  async waitForElementVisible(locator, sec = 5) {
    return waitFor(element(this._detectLocator(locator))).toBeVisible().withTimeout(sec * 1000);
  }

  /**
   * Waits an elment to become not visible.
   * 
   * ```js
   * I.waitToHide('#message', 2); // wait for 2 seconds
   * ```
   * 
   * @param {CodeceptJS.LocatorOrString} locator  an element to wait for
   * @param {number} [sec=5] number of seconds to wait
   */
  async waitToHide(locator, sec = 5) {
    return waitFor(element(this._detectLocator(locator))).toBeNotVisible().withTimeout(sec * 1000);
  }

  _detectLocator(locator, type = 'type') {
    if (typeof locator === 'object') {
      if (locator.android && this.device.getPlatform() === 'android') return this._detectLocator(locator.android, type);
      if (locator.ios && this.device.getPlatform() === 'ios') return this._detectLocator(locator.ios, type);
      if (locator.id) return by.id(locator.id);
      if (locator.label) return by.label(locator.label);
      if (locator.text) return by.text(locator.text);
      if (locator.type) return by.type(locator.type);
      if (locator.traits) return by.traits(locator.traits);
      return locator;
    }

    if (locator[0] === '#') {
      return by.id(locator.slice(1));
    }
    if (locator[0] === '~') {
      return by.label(locator.slice(1));
    }
    if (type === 'text') {
      return by.text(locator);
    }
    return by.type(locator);
  }
}

module.exports = Detox;
