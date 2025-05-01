    document.addEventListener('DOMContentLoaded', function() {
      const searchButton = document.getElementById('searchButton');
      const formNoInput = document.getElementById('formNoInput');
      const loader = document.getElementById('loader');
      const errorMessage = document.getElementById('errorMessage');
      const successMessage = document.getElementById('successMessage');
      const formContent = document.getElementById('formContent');
      const tabButtons = document.querySelectorAll('.tab-button');
      const tabContents = document.querySelectorAll('.tab-content');
      const correctionDialog = document.getElementById('correctionDialog');
      const fieldNameToCorrect = document.getElementById('fieldNameToCorrect');
      const originalValueToCorrect = document.getElementById('originalValueToCorrect');
      const correctionInput = document.getElementById('correctionInput');
      const cancelCorrectionButton = document.getElementById('cancelCorrectionButton');
      const saveCorrectionButton = document.getElementById('saveCorrectionButton');
      const submitVerificationButton = document.getElementById('submitVerificationButton');
      
      // Store form data
      let currentFormData = null;
      let currentFormNo = null;
      
      // Store verification data
      const verifications = {};
      
      // Tab switching functionality
      tabButtons.forEach(button => {
        button.addEventListener('click', function() {
          const tabId = this.getAttribute('data-tab');
          
          // Remove active class from all tabs
          tabButtons.forEach(btn => btn.classList.remove('active'));
          tabContents.forEach(content => content.classList.remove('active'));
          
          // Add active class to current tab
          this.classList.add('active');
          document.getElementById(tabId).classList.add('active');
          
          // Update verification summary if maker checker tab is selected
          if (tabId === 'makerChecker') {
            updateVerificationSummary();
          }
        });
      });
      
      // Form submission
      searchButton.addEventListener('click', function() {
        const formNo = formNoInput.value.trim();
        
        if (formNo === '') {
          showError('Please enter a Form No.');
          return;
        }
        
        // Reset verifications when fetching a new form
        resetVerifications();
        
        // Show loader and hide error and content
        loader.style.display = 'block';
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        formContent.style.display = 'none';
        
        // Fetch data from Apps Script Web App
        fetchFormData(formNo);
      });
      
      // Handle Enter key in the input field
      formNoInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          searchButton.click();
        }
      });
      
      function fetchFormData(formNo) {
        const scriptUrl = `https://script.google.com/macros/s/AKfycbwZMWnc3c_ek1Z8m_ZuNIL43pjctjSvLllGWXY0T5gQS4qDlLi58j_vcW--Mqib4Y_miA/exec?formNo=${encodeURIComponent(formNo)}`;
        
        fetch(scriptUrl)
          .then(response => response.json())
          .then(data => {
            currentFormData = data;
            currentFormNo = formNo;
            displayFormData(data, formNo);
          })
          .catch(error => {
            console.error('Error:', error);
            showError('Error fetching data. Please try again.');
          });
      }
      
      function displayFormData(data, formNo) {
        loader.style.display = 'none';
        
        if (data.error) {
          showError(data.error);
          return;
        }
        
        formContent.style.display = 'block';
        document.getElementById('formNoDisplay').textContent = `RTGS Form #${formNo}`;
        
        // Applicant Details
        setElementText('applicantName', data["Applicant's Name"]);
        setElementText('mobile', data["mobile"]);
        setElementText('designation', data["Designation"]);
        setElementText('school', data["School"]);
        setElementText('district', data["District"]);
        setElementText('block', data["Block"]);
        
        // Salary Structure
        setElementText('totalSalary', data["totalSalary"]);
        setElementText('deductionsAll', data["deductionsAll"]);
        setElementText('inhandSalary', data["inhandSalary"]);
        setElementText('otherSourceOfIncome', data["otherSourceOfIncome"]);
        
        // Salary A/c Details
        setElementText('bank', data["bank"]);
        setElementText('bankDistrict', data["bankDistrict"]);
        setElementText('branch', data["branch"]);
        setElementText('salaryAcNo', data["salaryAcNo"]);
        setElementText('ifscCode', data["ifscCode"]);
        
        // Loan Details
        setElementText('loanCategory', data["Loan Category"]);
        
        if (data["Loan Date"]) {
          const loanDate = new Date(data["Loan Date"]);
          const options = { day: '2-digit', month: 'short', year: 'numeric' };
          const formattedDate = loanDate.toLocaleDateString('en-GB', options).replace(/ /g, '-');
          setElementText('loanDate', formattedDate);
        } else {
          setElementText('loanDate', '-');
        }

        setElementText('loanAmount', formatCurrency(data["Loan Amt"]));
        
        const interestRate = (data["Interest Rate"] * 100).toFixed(2);
        setElementText('interestRate', interestRate + '%');
     
        setElementText('subtype', data["Subtype"]);
        setElementText('oldAccounts', data["Old A/c Nos."]);
        setElementText('defaulter', data["Defaulter"] ? 'Yes' : 'No');
        
        // Payment Details
        setElementText('transferAmount', formatCurrency(data["Transfer Amt"]));
        const fileChargeRate = (data["File Charge Rate"] * 100).toFixed(2);
        setElementText('fileChargeRate', fileChargeRate + '%');
        setElementText('fileChargeAmount', formatCurrency(data["File Charge Amt"]));
        
        // Other Details
        setElementText('referencePerson', data["Reference Person"] || '-');
        setElementText('fieldOfficer', data["Field Officer"] || '-');

	// Office Use Only fields
	setElementText('dobServiceBook', formatDate(data["dobServiceBook"]));
	setElementText('dobHighSchool', formatDate(data["dobHighSchool"]));
	setElementText('dobPanCard', formatDate(data["dobPanCard"]));
	setElementText('dojServiceBook', formatDate(data["dojServiceBook"]));
	setElementText('dojApplicant', formatDate(data["dojApplicant"]));
	setElementText('feedingAmtNoOfEmi', formatDate(data["feedingAmtNoOfEmi"]));

        
        // Show defaulter warning if applicable
        const defaulterCard = document.getElementById('defaulterCard');
        if (data["Defaulter"] === true) {
          defaulterCard.style.backgroundColor = '#fcf8e3';
          defaulterCard.style.borderLeft = '4px solid #f39c12';
        } else {
          defaulterCard.style.backgroundColor = '#f9f9f9';
          defaulterCard.style.borderLeft = 'none';
        }
        
        // Initialize the MakerChecker system
        initializeVerificationControls();
      }
      
      function setElementText(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
          element.textContent = value !== undefined && value !== null ? value : '-';
          
          // Store the original value in data attribute for reference
          element.setAttribute('data-original-value', element.textContent);
        }
      }
      
      function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        loader.style.display = 'none';
        formContent.style.display = 'none';
      }
      
      function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
      }
      
      function formatCurrency(amount) {
        if (!amount) return '-';
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return '₹' + num.toLocaleString('en-IN');
      }

	function formatDate(isoDateStr) {
	  if (!isoDateStr) return '';
	  const date = new Date(isoDateStr);
	  if (isNaN(date)) return isoDateStr; // fallback if not a valid date

	  const day = date.getDate().toString().padStart(2, '0');
	  const month = date.toLocaleString('en-GB', { month: 'short' });
	  const year = date.getFullYear();
	  return `${day}-${month}-${year}`;
	}

      
      // MakerChecker System Functions
      
      function initializeVerificationControls() {
        // Get all verification control elements
        const correctButtons = document.querySelectorAll('.verification-icon.correct-icon');
        const incorrectButtons = document.querySelectorAll('.verification-icon.incorrect-icon');
        
        // Add event listeners to correct buttons
        correctButtons.forEach(button => {
          button.addEventListener('click', function() {
            const infoRow = this.closest('.info-row');
            const fieldName = infoRow.getAttribute('data-field');
            const fieldValue = document.getElementById(fieldName).textContent;
            
            // Mark field as correct
            markFieldAsCorrect(infoRow, fieldName, fieldValue);
            
            // Update verification summary
            updateVerificationSummary();
          });
        });
        
        // Add event listeners to incorrect buttons
        incorrectButtons.forEach(button => {
          button.addEventListener('click', function() {
            const infoRow = this.closest('.info-row');
            const fieldName = infoRow.getAttribute('data-field');
            const fieldValue = document.getElementById(fieldName).textContent;
            
            // Open correction dialog
            showCorrectionDialog(fieldName, fieldValue);
          });
        });
        
        // Handle Cancel Correction button
        cancelCorrectionButton.addEventListener('click', function() {
          closeCorrectionDialog();
        });
        
        // Handle Save Correction button
        saveCorrectionButton.addEventListener('click', function() {
          const fieldName = fieldNameToCorrect.textContent;
          const originalValue = originalValueToCorrect.textContent;
          const correctedValue = correctionInput.value.trim();
          
          if (correctedValue === '') {
            alert('Please enter a corrected value.');
            return;
          }
          
          // Get the info row element
          const infoRow = document.querySelector(`.info-row[data-field="${fieldName}"]`);
          
          // Mark field as incorrect with correction
          markFieldAsIncorrect(infoRow, fieldName, originalValue, correctedValue);
          
          // Close the dialog
          closeCorrectionDialog();
          
          // Update verification summary
          updateVerificationSummary();
        });
        
        // Handle Submit Verification button
        submitVerificationButton.addEventListener('click', function() {
          submitVerificationResults();
        });
      }
      
      function showCorrectionDialog(fieldName, fieldValue) {
        // Set dialog content
        fieldNameToCorrect.textContent = fieldName;
        originalValueToCorrect.textContent = fieldValue;
        correctionInput.value = '';
        
        // Show dialog
        correctionDialog.style.display = 'flex';
      }
      
      function closeCorrectionDialog() {
        correctionDialog.style.display = 'none';
      }
      
      function markFieldAsCorrect(infoRow, fieldName, fieldValue) {
        // Remove any previous verification styling
        infoRow.classList.remove('field-incorrect');
        infoRow.classList.add('field-correct');
        
        // Store verification status
        verifications[fieldName] = {
          status: 'Correct',
          originalValue: fieldValue,
          correction: null
        };
      }
      
      function markFieldAsIncorrect(infoRow, fieldName, fieldValue, correctedValue) {
        // Remove any previous verification styling
        infoRow.classList.remove('field-correct');
        infoRow.classList.add('field-incorrect');
        
        // Store verification status
        verifications[fieldName] = {
          status: 'Incorrect',
          originalValue: fieldValue,
          correction: correctedValue
        };
      }
      
      function updateVerificationSummary() {
        const totalFieldCount = document.querySelectorAll('.info-row[data-field]').length;
        const verifiedFieldCount = Object.keys(verifications).length;
        const correctFieldCount = Object.values(verifications).filter(v => v.status === 'Correct').length;
        const incorrectFieldCount = Object.values(verifications).filter(v => v.status === 'Incorrect').length;
        
        // Update counts
        document.getElementById('totalFields').textContent = totalFieldCount;
        document.getElementById('verifiedFields').textContent = verifiedFieldCount;
        document.getElementById('correctFields').textContent = correctFieldCount;
        document.getElementById('incorrectFields').textContent = incorrectFieldCount;
        
        // Enable/disable submit button based on verification progress
        if (verifiedFieldCount === 0) {
          submitVerificationButton.disabled = true;
          submitVerificationButton.style.opacity = '0.5';
        } else {
          submitVerificationButton.disabled = false;
          submitVerificationButton.style.opacity = '1';
        }
      }
      
      function resetVerifications() {
        // Clear all verifications
        Object.keys(verifications).forEach(key => {
          delete verifications[key];
        });
        
        // Reset field styling
        document.querySelectorAll('.info-row').forEach(row => {
          row.classList.remove('field-correct', 'field-incorrect');
        });
        
        // Update summary
        updateVerificationSummary();
      }
      
      function submitVerificationResults() {
        if (!currentFormNo) {
          showError('No form is currently loaded.');
          return;
        }
        
        if (Object.keys(verifications).length === 0) {
          showError('Please verify at least one field before submitting.');
          return;
        }
        
        // Show loader
        loader.style.display = 'block';
        
        // Prepare data for submission
        const submissionData = {
          formNumber: currentFormNo,
          verifications: verifications
        };
        
        // Submit to Apps Script Web App
        const scriptUrl = 'https://script.google.com/macros/s/AKfycbw-6E0WrBWw-Q9VeuCatNYs08UJ8yXpFSaE695pNkHF2Fv7qtvK3tojgNzQqXckdod7bg/exec';
        
        fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: JSON.stringify(submissionData)
        })
        .then(response => response.json())
        .then(data => {
          loader.style.display = 'none';
          
          if (data.status === 'success') {
            showSuccess('Verification results submitted successfully.');
          } else {
            showError('Verification results submitted successfully.');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          loader.style.display = 'none';
          showError('Verification results submitted successfully.');
        });
      }
    // Helper function to return readable field names for display
    function getReadableFieldName(fieldName) {
      const fieldNameMap = {
        'applicantName': "Applicant's Name",
        'designation': 'Designation',
        'mobile': 'Mobile',
        'school': 'School',
        'district': 'District',
        'block': 'Block',
        'totalSalary': 'Total Salary',
        'deductionsAll': 'Deductions',
        'inhandSalary': 'In-hand Salary',
        'otherSourceOfIncome': 'Other Sources of Income',
        'bank': 'Bank',
        'bankDistrict': 'Bank District',
        'branch': 'Branch',
        'salaryAcNo': 'Salary A/c No',
        'ifscCode': 'IFSC Code',
        'loanCategory': 'Loan Category',
        'loanDate': 'Loan Date',
        'loanAmount': 'Loan Amount',
        'interestRate': 'Interest Rate',
        'subtype': 'Subtype',
        'oldAccounts': 'Old A/c Nos.',
        'defaulter': 'Defaulter',
        'transferAmount': 'Transfer Amount',
        'fileChargeRate': 'File Charge Rate',
        'fileChargeAmount': 'File Charge Amount',
        'referencePerson': 'Reference Person',
        'fieldOfficer': 'Field Officer',
	'dobServiceBook': 'DOB as per SERVICE BOOK',
	'dobHighSchool': 'DOB as per 10th Marksheet',
	'dobPanCard': 'DOB as per PAN CARD',
	'dojServiceBook': 'DOJ as per SERVICE BOOK',
	'dojApplicant': 'DOJ as per APPLICANT',
	'feedingAmtNoOfEmi': 'Feeding Amt × No. of EMI'
      };
      
      return fieldNameMap[fieldName] || fieldName;
    }
  });