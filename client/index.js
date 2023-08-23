axios.defaults.withCredentials = true;

axios.get(BASE_URL+'/profile')
        .then(function(response) {
          if (response.data === null){window.location.href = '/client/login.html'} else {
          const user = response.data;
            console.log(user)
            document.getElementById('usernamespan').textContent = user.firstname + " " + user.lastname
        }}).catch(function(error) {console.error('Data retrieval error:', error);});

document.getElementById('logoutBtn').addEventListener('click', handleLogout);
function handleLogout() {
axios.post(BASE_URL+'/logout')
    .then(() => {
    // Redirect the page to the login page
    window.location.href = '/client/login.html';
    })
    .catch((error) => {
    console.error('Logout failed:', error);
    });
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-analytics.js";
import { getDatabase, ref, child, get, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
// import { response } from "express";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBCqLto76Wdu4gCojSE9XoF1idZYXL6vYM",
    authDomain: "quan-trac-dat-prj.firebaseapp.com",
    databaseURL: "https://quan-trac-dat-prj-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "quan-trac-dat-prj",
    storageBucket: "quan-trac-dat-prj.appspot.com",
    messagingSenderId: "735004170493",
    appId: "1:735004170493:web:65e90332a7bcd259bf8694"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const dbRef = ref(getDatabase());


let myChartPie;
let chartDataPie = [];
let airHumidity;
let Rainfall;


onValue(child(dbRef, "Soil parameter"), (snapshot) => {
    // Lấy giá trị mới nhất từ snapshot
    const Potassium = snapshot.val().Potassium
    const Nitrogen = snapshot.val().Nitrogen
    const Phosphorus = snapshot.val().Phosphorus
    const canvas = document.getElementById('NPKpiechart');
    const noDataMessage = document.getElementById('noDataMessage');
    if (Potassium && Nitrogen && Phosphorus){
    // Thêm giá trị mới vào mảng dữ liệu của biểu đồ
    chartDataPie = [Nitrogen, Phosphorus, Potassium]
    // Vẽ biểu đồ với dữ liệu mới nhất
    if (myChartPie) {
        myChartPie.destroy();
    }

    myChartPie = new Chart('NPKpiechart', {
        type: 'doughnut',
        data: {
            labels: ["N","P","K"],
            datasets: [{
                label: 'My Data',
                data: chartDataPie,
                backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc'],
                hoverBackgroundColor: ['#2e59d9', '#17a673', '#2c9faf'],
                hoverBorderColor: "rgba(234, 236, 244, 1)",
            }],
        },
        options: {
            animation: {
                duration: 0 // Disable animation during chart creation
            },
            maintainAspectRatio: false,
            tooltips: {
              backgroundColor: "rgb(255,255,255)",
              bodyFontColor: "#858796",
              borderColor: '#dddfeb',
              borderWidth: 1,
              xPadding: 15,
              yPadding: 15,
              displayColors: false,
              caretPadding: 10,
            },
            legend: {
              display: false
            },
            cutoutPercentage: 80,
        },
    });} else {
        noDataMessage.style.display = 'block';
        canvas.style.display = 'none';
    }
});


setInterval(function () {
    get(child(dbRef, "Soil parameter")).then((snapshot) => {

        if (snapshot.exists()) {
            document.getElementById('divnitrogen').textContent = `${snapshot.val().Nitrogen} mg/kg`;
            document.getElementById('divkali').textContent = `${snapshot.val().Potassium} mg/kg`;
            document.getElementById('divphosphorus').textContent = `${snapshot.val().Phosphorus} mg/kg`;
            document.getElementById('divtemperature').textContent = `${snapshot.val().Temperature} °C`;
            document.getElementById('divmoisture').textContent = `${snapshot.val().Humidity} %`;
            document.getElementById('divph').textContent = `${snapshot.val().Ph}`;
        } else {
            console.log("No data available");
        }
    }).catch((error) => {
        console.error(error);

    });

}, 0)

onValue(child(dbRef, "Soil parameter"), (snapshot) => {
    const data = snapshot.val()
    axios.post(BASE_URL+'/getweather', {temperature:data.Temperature, pH:data.Ph, N:data.Nitrogen,P:data.Phosphorus,K:data.Potassium})
    .then(function(response){
        const weatherdata = response.data;
        Rainfall = weatherdata[0];
        airHumidity = weatherdata[1];
        console.log(weatherdata)
        document.getElementById('divrainfall').textContent = `${weatherdata[0]} mm`
        document.getElementById('divhumidity').textContent = `${weatherdata[1]} %`
        document.getElementById('divrecommended').innerHTML = `The recommended crop is <strong>${weatherdata[2].toUpperCase()}</strong>`
    }).catch(function(error){console.error('Data retrieval error:', error)})
});

onValue(child(dbRef, "Soil parameter"), (snapshot) => {
    document.getElementById('cropForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const cropInput = document.getElementById('cropInput');
        const selectedCrop = cropInput.value;
        const soilInput = document.getElementById('soilInput');
        const selectedSoil = soilInput.value;
        let fertilizer;
        const data = snapshot.val()
        axios.post(BASE_URL+'/tests/crops', {temperature:data.Temperature, pH:data.Ph, N:data.Nitrogen,P:data.Phosphorus,K:data.Potassium, soiltype:selectedSoil, croptype:selectedCrop, moisture:data.Humidity, rainfall: Rainfall,humidity: airHumidity, })
            .then((response) => {
                fertilizer = response.data;
                const recommendation = `Based on your inputs and analysis, for crop type "<strong>${selectedCrop}</strong>" and soil type "<strong>${selectedSoil}</strong>", we recommend using "<strong>${fertilizer}</strong>" fertilizer.`;
                const recommendationElement = document.getElementById('divfertilizer');
                recommendationElement.innerHTML = recommendation;
                recommendationElement.style.display = 'block';
            })
            .catch((err) => {console.err(err)})
    });
});


