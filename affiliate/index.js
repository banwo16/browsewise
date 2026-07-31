/* ==========================================================================
   affiliate/index.js — Network registry.

   To add a new affiliate network: create a module with the same shape
   (detect, parseUrl, extract, buildAffiliateUrl) and add it to this list
   ABOVE the `generic` fallback, which always matches last.
   ========================================================================== */

const amazon = require('./amazon');
const aliexpress = require('./aliexpress');
const ebay = require('./ebay');
const cj = require('./cj');
const impact = require('./impact');
const awin = require('./awin');
const generic = require('./generic');

const NETWORKS = [amazon, aliexpress, ebay, cj, impact, awin, generic];

function detectNetwork(url) {
  return NETWORKS.find((network) => network.detect(url)) || generic;
}

module.exports = { NETWORKS, detectNetwork };
