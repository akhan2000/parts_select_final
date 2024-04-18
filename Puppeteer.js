
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'refrigeratorpartstest.json');
let allProductsData = [];

// Function to scroll to the bottom of the page
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise(resolve => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= document.body.scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
    console.log('Completed auto-scrolling.');
}

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    page.on('console', consoleObj => console.log(consoleObj.text()));

    page.on('requestfailed', request => {
        console.log(`Request to ${request.url()} failed with status ${request.failure().errorText}`);
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36');

    try {
        console.log('Starting navigation to the main parts page...');
        await page.goto('https://www.partselect.com/Refrigerator-Parts.htm', { waitUntil: 'domcontentloaded', timeout: 6000 });
        console.log('Opened the main parts page.');

        console.log('Scrolling through the page to ensure all elements are loaded...');
        await autoScroll(page);

        console.log('Scraping popular products...');
        let popularProductsData = await page.evaluate(() => {
            let products = [];
            document.querySelectorAll('div.nf__part__detail').forEach(productElement => {
                const name = productElement.querySelector('a.nf__part__detail__title span')?.innerText.trim();
                const partNumber = productElement.querySelector('div.nf__part__detail__part-number strong')?.innerText.trim();
                const manufacturerPartNumber = productElement.querySelector('div.nf__part__detail__part-number.mb-2 strong')?.innerText.trim();
                const description = productElement.querySelector('div.nf__part__detail__part-number.mb-2')?.nextSibling.textContent.trim();
                const url = productElement.querySelector('a.nf__part__detail__title')?.getAttribute('href'); // Extract the URL
                if (name && partNumber && url) {
                    products.push({ name, partNumber, manufacturerPartNumber, description, url });
                }
            });
            return products;
        });

        console.log(`Scraped ${popularProductsData.length} popular products`);
        allProductsData.push(...popularProductsData);

        console.log('Scraping related parts...');
        const relatedPartsLinks = await page.evaluate(() => {
            let links = [];
            document.querySelectorAll('#ShopByPartType + ul.nf__links li a').forEach(linkElement => {
                const url = linkElement.getAttribute('href');
                links.push(url);
            });
            return links;
        });

        for (const link of relatedPartsLinks) {
            await page.goto('https://www.partselect.com' + link);
            await autoScroll(page);

            let relatedProductsData = await page.evaluate(() => {
                let products = [];
                document.querySelectorAll('div.nf__part__detail').forEach(productElement => {
                    const name = productElement.querySelector('a.nf__part__detail__title span')?.innerText.trim();
                    const partNumber = productElement.querySelector('div.nf__part__detail__part-number strong')?.innerText.trim();
                    const manufacturerPartNumber = productElement.querySelector('div.nf__part__detail__part-number.mb-2 strong')?.innerText.trim();
                    const description = productElement.querySelector('div.nf__part__detail__part-number.mb-2')?.nextSibling.textContent.trim();
                    const url = productElement.querySelector('a.nf__part__detail__title')?.getAttribute('href');
                    if (name && partNumber && url) {
                        products.push({ name, partNumber, manufacturerPartNumber, description, url });
                    }
                });
                return products;
            });

            console.log(`Scraped ${relatedProductsData.length} related products`);
            allProductsData.push(...relatedProductsData);
        }

        console.log('Navigating to each product detail page to extract additional information...');


        await autoScroll(page);
        // Inside the loop for navigating to each product
                // detail page
                // Inside the loop for navigating to each product detail page
for (const product of allProductsData) {
    await page.goto('https://www.partselect.com' + product.url); // Navigate to the product detail page using the extracted URL

    // Check if the product detail page requires scrolling
    // If necessary, use the autoScroll function here
    await autoScroll(page);

    // Extract additional details
    const additionalDetails = await page.evaluate(() => {
        const partSelectNumber = document.querySelector('span[itemprop="productID"]')?.textContent.trim();
        const manufacturerPartNumber = document.querySelector('span[itemprop="mpn"]')?.textContent.trim();
        const manufacturedBy = document.querySelector('span[itemprop="brand"]')?.textContent.trim();
        const productDescription = document.querySelector('div[itemprop="description"]')?.textContent.trim().replace(/\n/g, '');
        let productPrice = document.querySelector('.price')?.textContent.trim().replace(/\n/g, '');
        productPrice = productPrice ? productPrice.replace(/\s/g, '') : productPrice; //
        const videoId = document.querySelector('div.yt-video')?.getAttribute('data-yt-init');
        const compatibleParts = document.querySelector('.compatible-products')?.textContent.trim().replace(/\n/g, ''); // replace the selector with the correct one
        const troubleshooting = document.querySelector('.section-title.bold')?.nextElementSibling.textContent.trim().replace(/\n/g, '').replace(/\s+/g, ' ');
        const modelCrossReference = Array.from(document.querySelectorAll('.pd__crossref__list.js-dataContainer.js-infiniteScroll .row')).map(item => item.textContent.trim().replace(/\n/g, ''));
        const replacedParts = document.querySelector('.col-md-6.mt-3 div[data-collapse-container]')?.textContent.trim().replace(/\n/g, '');    
        const replacementTutorialVideoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
        return { partSelectNumber, manufacturerPartNumber, manufacturedBy, productDescription, productPrice, replacementTutorialVideoUrl, compatibleParts, troubleshooting, modelCrossReference, replacedParts};
    });

    // Extract the first 5 most helpful repair stories
    const repairStories = await page.$$eval('.repair-story', (stories) => {
        return stories.slice(0, 5).map(storyElement => {
            const storyTitle = storyElement.querySelector('.repair-story__title')?.textContent.trim();
            let repairInstruction = storyElement.querySelector('.repair-story__instruction .js-searchKeys')?.textContent.trim();
            repairInstruction = repairInstruction.replace(/\s*\.\.\.\s*Read more\s*/g, ' ').replace(/\s+/g, ' ');
            return { storyTitle, repairInstruction };
        });
    });

    // Extract the top 10 question-answer pairs
    const questionAnswerPairs = await page.evaluate(() => {
        const pairs = Array.from(document.querySelectorAll('.qna__question.js-qnaResponse')).slice(0, 10).map(pairElement => {
            const customerQuestion = pairElement.querySelector('.js-searchKeys')?.textContent.trim();
            const expertAnswer = pairElement.querySelector('.qna__ps-answer__msg .js-searchKeys')?.textContent.trim();
            return { customerQuestion, expertAnswer };
        });
        return pairs;
    });

    product.partSelectNumber = additionalDetails.partSelectNumber;
    product.manufacturerPartNumber = additionalDetails.manufacturerPartNumber;
    product.manufacturedBy = additionalDetails.manufacturedBy;
    product.description = additionalDetails.productDescription;
    product.price = additionalDetails.price;
    product.compatibleParts = additionalDetails.compatibleParts;
    product.troubleshooting = additionalDetails.troubleshooting;
    product.videoUrl = additionalDetails.replacementTutorialVideoUrl;
    product.modelCrossReference = additionalDetails.modelCrossReference;
    product.replacedParts = additionalDetails.replacedParts;

    // Assign the extracted repair stories and question-answer pairs to the product object
    product.repairStories = repairStories;
    product.questionAnswerPairs = questionAnswerPairs;
}
console.log('All product details extracted.');
    } catch (error) {
        console.error('An error occurred during scraping:', error);
    } finally {
        // Write to the output file even if there was an error
        fs.writeFileSync(outputFile, JSON.stringify(allProductsData, null, 2));
        console.log(`Scraped data saved to ${outputFile}`);
        // Close the browser
        await browser.close();
    }
})();



// const puppeteer = require('puppeteer');
// const fs = require('fs');
// const path = require('path');

// const outputFile = path.join(__dirname, 'output.json');
// let allProductsData = [];

// // Function to scroll to the bottom of the page
// async function autoScroll(page) {
//     await page.evaluate(async () => {
//         await new Promise(resolve => {
//             var totalHeight = 0;
//             var distance = 100;
//             var timer = setInterval(() => {
//                 window.scrollBy(0, distance);
//                 totalHeight += distance;
//                 if (totalHeight >= document.body.scrollHeight) {
//                     clearInterval(timer);
//                     resolve();
//                 }
//             }, 100);
//         });
//     });
//     console.log('Completed auto-scrolling.');
// }

// (async () => {
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();
//     page.on('console', consoleObj => console.log(consoleObj.text()));

//     page.on('requestfailed', request => {
//         console.log(`Request to ${request.url()} failed with status ${request.failure().errorText}`);
//     });

//     await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36');

//     try {
//         console.log('Starting navigation to the main parts page...');
//         await page.goto('https://www.partselect.com/Refrigerator-Parts.htm', { waitUntil: 'domcontentloaded', timeout: 6000 });
//         console.log('Opened the main parts page.');

//         console.log('Scrolling through the page to ensure all elements are loaded...');
//         await autoScroll(page);

//         console.log('Scraping popular products...');
//         let popularProductsData = await page.evaluate(() => {
//             let products = [];
//             document.querySelectorAll('div.nf__part__detail').forEach(productElement => {
//                 const name = productElement.querySelector('a.nf__part__detail__title span')?.innerText.trim();
//                 const partNumber = productElement.querySelector('div.nf__part__detail__part-number strong')?.innerText.trim();
//                 const manufacturerPartNumber = productElement.querySelector('div.nf__part__detail__part-number.mb-2 strong')?.innerText.trim();
//                 const description = productElement.querySelector('div.nf__part__detail__part-number.mb-2')?.nextSibling.textContent.trim();
//                 const url = productElement.querySelector('a.nf__part__detail__title')?.getAttribute('href'); // Extract the URL
//                 if (name && partNumber && url) {
//                     products.push({ name, partNumber, manufacturerPartNumber, description, url });
//                 }
//             });
//             return products;
//         });

//         console.log(`Scraped ${popularProductsData.length} popular products`);
//         allProductsData.push(...popularProductsData);

//         console.log('Navigating to each product detail page to extract additional information...');

//         // Inside the loop for navigating to each product detail page
//         for (const product of allProductsData) {
//             await page.goto('https://www.partselect.com' + product.url); // Navigate to the product detail page using the extracted URL

//             // Check if the product detail page requires scrolling
//             // If necessary, use the autoScroll function here
//             await autoScroll(page);

//             // Extract additional details
//             const additionalDetails = await page.evaluate(() => {
//                 const partSelectNumber = document.querySelector('span[itemprop="productID"]')?.textContent.trim();
//                 const manufacturerPartNumber = document.querySelector('span[itemprop="mpn"]')?.textContent.trim();
//                 const manufacturedBy = document.querySelector('span[itemprop="brand"]')?.textContent.trim();
//                 const description = document.querySelector('div[itemprop="description"]')?.textContent.trim().replace(/\n/g, '');
//                 const price = document.querySelector('.price')?.textContent.trim().replace(/\n/g, '');
//                 const compatibleParts = document.querySelector('.compatible-products')?.textContent.trim().replace(/\n/g, ''); // replace the selector with the correct one
//                 const fixedSymptoms = Array.from(document.querySelectorAll('.fixed-symptoms li')).map(symptom => symptom.textContent.trim().replace(/\n/g, ''));
//                 const troubleshooting = document.querySelector('.section-title.bold')?.nextElementSibling.textContent.trim().replace(/\n/g, '').replace(/\s+/g, ' ');
//                 const modelCrossReference = Array.from(document.querySelectorAll('.pd__crossref__list.js-dataContainer.js-infiniteScroll .row')).map(item =>                item.textContent.trim().replace(/\n/g, ''));
//                 const replacedParts = document.querySelector('.col-md-6.mt-3 div[data-collapse-container]')?.textContent.trim().replace(/\n/g, '');
//                 return { partSelectNumber, manufacturerPartNumber, manufacturedBy, description, price, compatibleParts, fixedSymptoms, troubleshooting, modelCrossReference, replacedParts };
//             });

//             // Assign the extracted details to the product object
//             product.partSelectNumber = additionalDetails.partSelectNumber;
//             product.manufacturerPartNumber = additionalDetails.manufacturerPartNumber;
//             product.manufacturedBy = additionalDetails.manufacturedBy;
//             product.description = additionalDetails.description;
//             product.price = additionalDetails.price;
//             product.compatibleParts = additionalDetails.compatibleParts;
//             product.fixedSymptoms = additionalDetails.fixedSymptoms;
//             product.troubleshooting = additionalDetails.troubleshooting;
//             product.modelCrossReference = additionalDetails.modelCrossReference;
//             product.replacedParts = additionalDetails.replacedParts;
//         }

//         console.log('All product details extracted.');

//     } catch (error) {
//         console.error('An error occurred during scraping:', error);
//     } finally {
//         // Write to the output file even if there was an error
//         fs.writeFileSync(outputFile, JSON.stringify(allProductsData, null, 2));
//         console.log(`Scraped data saved to ${outputFile}`);
//         // Close the browser
//         await browser.close();
//     }
// })();
                    
                    
                    
                    
                    
                    
                    
                    
                    
//                     const puppeteer = require('puppeteer');
// const fs = require('fs');
// const path = require('path');

// const outputFile = path.join(__dirname, 'output.json');
// let allProductsData = [];

// // Function to scroll to the bottom of the page
// async function autoScroll(page) {
//     await page.evaluate(async () => {
//         await new Promise(resolve => {
//             var totalHeight = 0;
//             var distance = 100;
//             var timer = setInterval(() => {
//                 window.scrollBy(0, distance);
//                 totalHeight += distance;
//                 if (totalHeight >= document.body.scrollHeight) {
//                     clearInterval(timer);
//                     resolve();
//                 }
//             }, 100);
//         });
//     });
//     console.log('Completed auto-scrolling.');
// }

// (async () => {
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();
//     page.on('console', consoleObj => console.log(consoleObj.text()));

//     page.on('requestfailed', request => {
//         console.log(`Request to ${request.url()} failed with status ${request.failure().errorText}`);
//     });

//     await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36');

//     try {
//         console.log('Starting navigation to the main parts page...');
//         await page.goto('https://www.partselect.com/Refrigerator-Parts.htm', { waitUntil: 'domcontentloaded', timeout: 6000 });
//         console.log('Opened the main parts page.');

//         console.log('Scrolling through the page to ensure all elements are loaded...');
//         await autoScroll(page);

//         console.log('Scraping popular products...');
//         let popularProductsData = await page.evaluate(() => {
//             let products = [];
//             document.querySelectorAll('div.nf__part__detail').forEach(productElement => {
//                 const name = productElement.querySelector('a.nf__part__detail__title span')?.innerText.trim();
//                 const partNumber = productElement.querySelector('div.nf__part__detail__part-number strong')?.innerText.trim();
//                 const manufacturerPartNumber = productElement.querySelector('div.nf__part__detail__part-number.mb-2 strong')?.innerText.trim();
//                 const description = productElement.querySelector('div.nf__part__detail__part-number.mb-2')?.nextSibling.textContent.trim();
//                 const url = productElement.querySelector('a.nf__part__detail__title')?.getAttribute('href'); // Extract the URL
//                 if (name && partNumber && url) {
//                     products.push({ name, partNumber, manufacturerPartNumber, description, url }); // Include the URL in the product data
//                 }
//             });
//             return products;
//         });

//         console.log(`Scraped ${popularProductsData.length} popular products`);
//         allProductsData.push(...popularProductsData);

//         console.log('Navigating to each product detail page to extract additional information...');

//         // Inside the loop for navigating to each product detail page
//         for (const product of popularProductsData) {
//             await page.goto('https://www.partselect.com' + product.url); // Navigate to the product detail page using the extracted URL

//             // Check if the product detail page requires scrolling
//             // If necessary, use the autoScroll function here
//              await autoScroll(page);

// // Extract troubleshooting and model cross-reference details
// const additionalDetails = await page.evaluate(() => {
//     const price = document.querySelector('.price')?.textContent.trim().replace(/\n/g, '');
//     const description = document.querySelector('.pd_description')?.textContent.trim().replace(/\n/g, '');
//     const manufacturedBy = document.querySelector('.manufactured-by')?.textContent.trim().replace(/\n/g, '');
//     const compatibleParts = document.querySelector('.compatible-products')?.textContent.trim().replace(/\n/g, ''); // replace the selector with the correct one
//     const fixedSymptoms = Array.from(document.querySelectorAll('.fixed-symptoms li')).map(symptom => symptom.textContent.trim().replace(/\n/g, ''));
//     const troubleshooting = document.querySelector('.section-title.bold')?.nextElementSibling.textContent.trim().replace(/\n/g, '').replace(/\s+/g, ' ');
//     const modelCrossReference = Array.from(document.querySelectorAll('.pd__crossref__list.js-dataContainer.js-infiniteScroll .row')).map(item => item.textContent.trim().replace(/\n/g, ''));
//     const replacedParts = document.querySelector('.col-md-6.mt-3 div[data-collapse-container]')?.textContent.trim().replace(/\n/g, '');
//     return { price, description, manufacturedBy, compatibleParts, fixedSymptoms, troubleshooting, modelCrossReference, replacedParts };
// });

// product.price = additionalDetails.price;
// product.partNumber = productDetails.partSelectNumber;
// product.manufacturerPartNumber = productDetails.manufacturerPartNumber;
// product.manufacturedBy = productDetails.manufacturedBy;
// product.description = productDetails.description;
// product.compatibleParts = additionalDetails.compatibleParts;
// product.manufacturedBy = additionalDetails.manufacturedBy;
// product.replacedBrands = additionalDetails.replacedBrands;
// product.fixedSymptoms = additionalDetails.fixedSymptoms;
// product.troubleshooting = additionalDetails.troubleshooting;
// product.modelCrossReference = additionalDetails.modelCrossReference;
// product.replacedParts = additionalDetails.replacedParts;
//         }

//         console.log('All product details extracted.');

//     } catch (error) {
//         console.error('An error occurred during scraping:', error);
//     } finally {
//         // Write to the output file even if there was an error
//         fs.writeFileSync(outputFile, JSON.stringify(allProductsData, null, 2));
//         console.log(`Scraped data saved to ${outputFile}`);
//         // Close the browser
//         await browser.close();
//     }
// })();
   

// const puppeteer = require('puppeteer');
// const fs = require('fs');
// const path = require('path');

// const outputFile = path.join(__dirname, 'output.json'); // The directory where the output file will be saved
// let allProductsData = [];

// (async () => {
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();

//     // Increase the navigation timeout to 60 seconds
//     await page.setDefaultNavigationTimeout(60000);

//     try {
//         // Navigate to the main refrigerator parts page
//         await page.goto('https://www.partselect.com/Refrigerator-Parts.htm', { waitUntil: 'networkidle0' });
//         console.log('Opened the main parts page');

//         // Wait for the selectors to be sure they're loaded and scroll to make sure all popular products are rendered
//         await page.waitForSelector('div.nf_part_mb-3');
//         await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

//         // Wait for any lazy-loaded images or content, if necessary
//         await page.waitForTimeout(5000); // wait for 5 seconds, adjust the timing as necessary

//         // Scrape the popular products
//         let popularProductsData = await page.evaluate(() => {
//             let products = [];
//             document.querySelectorAll('div.nf_part_mb-3').forEach(productElement => {
//                 const name = productElement.querySelector('.nf_part_detail_title a')?.innerText.trim();
//                 const partNumber = productElement.querySelector('.nf_part_detail_part-number')?.innerText.trim();
//                 const manufacturerPartNumber = productElement.querySelector('.nf_part_detail_part-number')?.innerText.split(' ')[2]?.trim();
//                 // Additional details can be extracted here as required
//                 if (name) {
//                     products.push({ name, partNumber, manufacturerPartNumber /* other details can be added here */ });
//                 }
//             });
//             return products;
//         });

//         console.log(`Scraped ${popularProductsData.length} popular products`);

//         // Add popular products to allProductsData
//         allProductsData.push(...popularProductsData);

//     // Get all related category links
//     let categoryLinks = await page.evaluate(() => {
//         return Array.from(document.querySelectorAll('#ShopByPartType + div a')).map(a => a.href);
//     });
//     console.log(`Found ${categoryLinks.length} category links`);

//     // Navigate to each category and scrape products
//     for (const link of categoryLinks) {
//         console.log(`Navigating to category page: ${link}`);
//         await page.goto(link, { waitUntil: 'networkidle0' });

//         // Continue the same scraping process on each category page
//         // Assuming the category pages have a similar layout to the main page
//         let productsOnCategoryPage = await page.evaluate(() => {
//             let products = [];
//             // ... repeat the similar scraping process as above for each category page ...
//             return products;
//         });

//         // Add the scraped data from the category page to allProductsData
//         allProductsData.push(...productsOnCategoryPage);
