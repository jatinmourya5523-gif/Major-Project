const Listing = require("../models/listing.js");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req, res) => {
    const { category } = req.query;

    let allListings;

    if (category) {
        allListings = await Listing.find({ category: category });
    } else {
        allListings = await Listing.find({});
    }

    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
  .populate({path: "reviews", populate: {path: "author"}})
  .populate("owner");
  if(!listing) {
    req.flash("error", "Listing you requested for does't exist!");
   return res.redirect("/listings");
  }
  res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res) => {
    const { location, country } = req.body.listing;

    const response = await geocodingClient
        .forwardGeocode({
            query: `${location}, ${country}`,
            limit: 1
        })
        .send();

    if (!response.body.features.length) {
        req.flash("error", "Location not found. Please enter a valid location.");
        return res.redirect("/listings/new");
    }

    const feature = response.body.features[0];

    const newListing = new Listing(req.body.listing);

    newListing.owner = req.user._id;

    newListing.image = {
        url: req.file.path,
        filename: req.file.filename
    };

    newListing.geometry = feature.geometry;

    await newListing.save();

    console.log("Entered Location:", location);
    console.log("Entered Country:", country);
    console.log("Mapbox Result:", feature.place_name);
    console.log("Coordinates:", feature.geometry.coordinates);

    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
   if(!listing) {
    req.flash("error", "Listing you requested for does't exist!");
   return res.redirect("/listings");
  }

  res.render("listings/edit.ejs", { listing });
};

module.exports.updateListing = async (req, res) => {
  let { id } = req.params;
  let listing = await Listing.findByIdAndUpdate(id, {...req.body.listing});

  if(typeof req.file !== "undefined") {
  let url = req.file.path;
  let filename = req.file.filename;
  listing.image =  { url, filename };
  await listing.save();
  }

  req.flash("success", "Listing Updated");
  res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
}