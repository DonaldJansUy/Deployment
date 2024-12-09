const express = require('express');
const router = express.Router();

router.patch('/:propertyId', async (req, res) => {
  const { propertyId } = req.params;
  const { userId, ...propertyData } = req.body;

  // Input validation
  if (!propertyId || !userId) {
    return res.status(400).json({ message: 'Missing required data' });
  }

  // Start a transaction
  db.beginTransaction((err) => {
    if (err) {
      console.error('Transaction error:', err);
      return res.status(500).json({ message: 'Transaction failed', error: err.message });
    }

    // Verify if property exists and belongs to the user
    const verifyQuery = `
      SELECT * FROM propertylisting 
      WHERE property_id = ? AND userID = ?
    `;

    db.query(verifyQuery, [propertyId, userId], (err, result) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error fetching property:', err);
          res.status(500).json({ message: 'Failed to fetch property', error: err.message });
        });
      }

      if (result.length === 0) {
        return db.rollback(() => {
          res.status(404).json({ message: 'Property not found or unauthorized' });
        });
      }

      // Prepare the update queries with proper data validation
      const updateListingQuery = `
        UPDATE propertylisting 
        SET 
          userID = ?, 
          property_name = ?, 
          location_id = ?, 
          growth_zone = ?, 
          description = ?,
          dimensions_length = ?, 
          dimensions_width = ?, 
          dimensions_height = ?,
          soil_type = ?, 
          amenities = ?, 
          restrictions = ?, 
          rent_base_price = ?
        WHERE property_id = ?
      `;

      // Prepare values, matching the front-end data structure
      const listingValues = [
        userId,
        propertyData.propertyName,
        propertyData.location_id || result[0].location_id,
        propertyData.growthzone,
        propertyData.description || '',
        propertyData.length,
        propertyData.width,
        propertyData.height,
        propertyData.soilType,
        propertyData.amenities = propertyData.amenities ? String(propertyData.amenities) : "Nothing Listed"
        propertyData.restrictions = propertyData.restrictions ? String(propertyData.restrictions) : "None Listed"
        propertyData.price,
        propertyId
      ];

      db.query(updateListingQuery, listingValues, (err) => {
        if (err) {
          return db.rollback(() => {
            console.error('Listing update error:', err);
            res.status(500).json({ message: 'Failed to update property listing', error: err.message });
          });
        }

        // Update location
        const updateLocationQuery = `
          UPDATE propertylocation SET 
            address_line1 = ?,
            city = ?,
            province = ?,
            postal_code = ?,
            country = ?,
            latitude = ?,
            longitude = ?
          WHERE location_id = (
            SELECT location_id FROM propertylisting WHERE property_id = ?
          )
        `;

        const locationValues = [
          propertyData.addressLine1,
          propertyData.city,
          propertyData.province,
          propertyData.postalCode,
          propertyData.country,
          propertyData.latitude,
          propertyData.longitude,
          propertyId
        ];

        db.query(updateLocationQuery, locationValues, (err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Location update error:', err);
              res.status(500).json({ message: 'Failed to update location', error: err.message });
            });
          }

          // Update PropertyCrops table
          const updateCropsPromise = new Promise((resolve, reject) => {
            // First delete existing crops for this property
            const deleteCropsQuery = `DELETE FROM propertycrops WHERE property_id = ?`;
            
            db.query(deleteCropsQuery, [propertyId], (err) => {
              if (err) {
                reject(err);
                return;
              }

              // If there are new crops to insert
              if (propertyData.possibleCrops && propertyData.possibleCrops.length > 0) {
                // Create values array for bulk insert
                const cropValues = propertyData.possibleCrops.map(cropName => [propertyId, cropName]);
                
                // Insert new crops
                const insertCropsQuery = `
                  INSERT INTO propertycrops (property_id, crop_name) 
                  VALUES ?
                `;

                db.query(insertCropsQuery, [cropValues], (err) => {
                  if (err) reject(err);
                  else resolve();
                });
              } else {
                resolve(); // Resolve if no new crops to insert
              }
            });
          });

          // Update images
          const updateImagesPromises = [];

          // Update primary image if provided
          if (propertyData.primaryImageUrl) {
            const updatePrimaryImageQuery = `
              UPDATE propertyprimaryimages 
              SET image_url = ?, updated_at = CURRENT_TIMESTAMP
              WHERE property_id = ?
            `;
            updateImagesPromises.push(
              new Promise((resolve, reject) => {
                db.query(updatePrimaryImageQuery, [propertyData.primaryImageUrl, propertyId], (err) => {
                  if (err) reject(err);
                  else resolve();
                });
              })
            );
          }

          // Update other images if provided
          if (propertyData.otherImageUrls && propertyData.otherImageUrls.length > 0) {
            const deleteOtherImagesQuery = `DELETE FROM propertyotherimages WHERE property_id = ?`;
            const insertOtherImagesQuery = `
              INSERT INTO propertyotherimages (property_id, image_url) 
              VALUES ?
            `;

            updateImagesPromises.push(
              new Promise((resolve, reject) => {
                db.query(deleteOtherImagesQuery, [propertyId], (err) => {
                  if (err) reject(err);
                  else {
                    const imageValues = propertyData.otherImageUrls.map(url => [propertyId, url]);
                    db.query(insertOtherImagesQuery, [imageValues], (err) => {
                      if (err) reject(err);
                      else resolve();
                    });
                  }
                });
              })
            );
          }

          // Execute all updates (crops and images)
          Promise.all([updateCropsPromise, ...updateImagesPromises])
            .then(() => {
              // Commit transaction
              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Commit error:', err);
                    res.status(500).json({ message: 'Failed to commit transaction', error: err.message });
                  });
                }
                res.status(200).json({ 
                  message: 'Property updated successfully', 
                  propertyId 
                });
              });
            })
            .catch(err => {
              db.rollback(() => {
                console.error('Update error:', err);
                res.status(500).json({ message: 'Failed to update property data', error: err.message });
              });
            });
        });
      });
    });
  });
});

module.exports = router;
