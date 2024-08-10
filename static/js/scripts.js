function nextStep(step) {
    const currentStep = document.querySelector('.step:not([style*="display: none"])');
    if (currentStep) {
    currentStep.style.display = 'none';
    }
    const nextStep = document.getElementById('step' + step);
    if (nextStep) {
    nextStep.style.display = 'block';
    }
   }
   function showRoute() {
    // Placeholder function for displaying the optimized route.
    alert("Displaying the optimized route!");
   }
   function applyFilters() {
    const typeFilter = document.getElementById('type-filter').value;
    const distanceFilter = document.getElementById('distance-filter').value;
    const ratingFilter = document.getElementById('rating-filter').value;
    const items = document.querySelectorAll('.recommendation-item');
    items.forEach(item => {
    const type = item.getAttribute('data-type');
    const distance = item.getAttribute('data-distance');
    const rating = parseFloat(item.getAttribute('data-rating'));
    let typeMatch = typeFilter === '' || type === typeFilter;
    let distanceMatch = distanceFilter === '' || distance === distanceFilter;
    let ratingMatch = ratingFilter === '' || rating >= parseFloat(ratingFilter);
    if (typeMatch && distanceMatch && ratingMatch) {
    item.style.display = 'block';
    } else {
    item.style.display = 'none';
    }
    });
   }   