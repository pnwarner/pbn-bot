#Currently running /usr/bin/chromedriver requires root escalation on rpi
#requires python3, python3-selenium
#Some distributions require manual install of chromium-driver

#Component159 - Player lists
#Component157 - Player lists container

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

def startChromiumBrowser(showBrowser = True, browserInitType = 'debian'):
  # Selenium Chromium chromedriver Options:
  chromeOptions = Options()
  
  if (showBrowser == False):
    #These options were also needed to run chromium headless on rpi as root
    #Browser loaded with --headless mode.
    chromeOptions.add_argument('--headless=new')
    chromeOptions.add_argument('--no-sandbox')
    chromeOptions.add_argument('--disable-dev-shm-usage')
  else:
    #Options for Non-headless:
    chromeOptions.add_experimental_option("excludeSwitches", ['enable-automation']);
    chromeOptions.add_argument("disable-infobars")
    chromeOptions.add_argument("start-maximized")
    chromeOptions.add_argument("--disable-extensions")

  #Enable reading DOM Javascript Console.log()
  chromeOptions.set_capability("goog:loggingPrefs", {'browser': 'ALL'})
  #Load Chromium with specified load type:
  try:
    #Initializing web browser. Please wait..
    #Termux-proot-Debian
    if (browserInitType == 'termux'):
      browser = webdriver.Chrome(executable_path='/usr/bin/chromedriver', options=chromeOptions)
    #Debian- Selenium4 (Default)
    if (browserInitType == 'debian'):
      servicePath = '/usr/bin/chromedriver'
      chromeService = Service(servicePath)
      browser = webdriver.Chrome(service=chromeService, options=chromeOptions)
  except:
    #An error has occurred initializing chromedriver.
    return False
  else:
    return browser

def findIfElementExistsByText(browser, textToFind):
  #Find if an element exists by the text within the tags <Element>"Text to search for"</Element>
  #Returns True if an element with that text is found
  #Returns False if text cannot be located in DOM
  try:
    browser.find_element_by_xpath("// div[contains(text(),'" + textToFind + "')]").click()
  except:
    return False
  else:
    return True

def clickElement(browser, targetElement):
  #print('Locating element to click.')
  try:
    locateElement = WebDriverWait(browser, 10).until(
        EC.presence_of_element_located((By.ID, targetElement))
    )
  finally:
    if locateElement:
      #print('Target Element located.')
      try:
        selectElement = WebDriverWait(browser, 10).until(
         EC.element_to_be_clickable((By.ID, targetElement))
        )
      finally:
        if selectElement:
          confirmedElement = browser.find_element_by_id(targetElement)
          confirmedElement.click()
          return True
    else:
      #print('Target element was not located.')
      return False
     
def isElementPresentByID(browser, targetElement):
  #print('Locating element to click.')
  try:
    locateElement = WebDriverWait(browser, 10).until(
        EC.presence_of_element_located((By.ID, targetElement))
    )
  finally:
    if(locateElement):
      return True
    else:
      return False

def insertTextToElement(browser, targetElement, textToInsert, hitEnterKey=False):
  #print('Locating defined textbox.')
  abortSend = 0
  try:
    locateTextbox = WebDriverWait(browser, 10).until(
        EC.presence_of_element_located((By.ID, targetElement))
    )
  except:
    return False
  finally:
    if locateTextbox:
      #print('Target textbox located.')
      try:
        selectTextbox = WebDriverWait(browser, 10).until(
         EC.element_to_be_clickable((By.ID, targetElement))
        )
      except:
        #Something Went wrong.
        #print('Unable to send text to input box!')
        abortSend = 1
        selectTextbox = False
        return False
      finally:
        if (abortSend == 0):
          if selectTextbox:
            confirmedTextbox = browser.find_element_by_id(targetElement)
            if hitEnterKey:
              confirmedTextbox.send_keys(textToInsert, Keys.ENTER)
            else:
              confirmedTextbox.send_keys(textToInsert)
          return True
    else:
      if abortSend == 1:
        #print('Target textbox was not located.')
        return False
      
def injectJavaScriptFileToDOM(browser, jsFile):
  #print('[paraBOT] Injecting: [%s] into DOM.' % jsFile)
  try:
    browser.execute_script(open(jsFile).read())
  except:
    return False
  return True
  
def countElementsInParent(browser, parentID, elementToCount):
  listBox = browser.find_element_by_id(parentID)
  itemList = listBox.find_elements_by_tag_name(elementToCount)
  itemLen = len(itemList)
  return itemLen

def getListOfElementTextInParent(browser, parentID, elementToFind):
  parentElement = browser.find_element_by_id(parentID)
  childElements = parentElement.find_elements_by_tag_name(elementToFind)
  textList = []
  for element in childElements:
    textList.append(element.text)
  return textList
