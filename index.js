const SOURCE = "beacon.rgrannell.xyz";
const GET_LOCATION_INTERVAL = 1000 * 60 * 5;
const GET_INTERVAL_TIMEOUT = 5 * 60 * 1000;

function watchPosition(options) {
  return new Promise((resolve, reject) => {
    return navigator.geolocation.watchPosition(resolve, reject, options);
  });
}

/* */
function setImmediateInterval(fn, interval) {
  setTimeout(fn, 0);
  return setInterval(fn, interval);
}

class Geolocation {
  static from(position) {
    return {
      source: SOURCE,
      deviceId: "",
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitude_accuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      speed: position.coords.speed,
      createdAt: position.timestamp,
    };
  }
}

class CommonStorage {
  static async postGeolocation(message) {
    const conn = app.fetchConnectionDetails();
    const credentials = `${conn.username}:${conn.password}`;
    const endpoint = conn.endpoint;

    return fetch(`${endpoint}content/${conn.topic}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(credentials.trim())}`,
      },
      body: JSON.stringify({
        content: [{
          ...message,
          deviceId: conn.device,
        }],
      }),
    });
  }
}

class App {
  state = "inactive";
  stateData = {
    successes: 0,
    failures: 0,
  };

  onPositionError(err) {
    console.error(err);
  }

  fetchConnectionDetails() {
    const endpoint = document.getElementById("endpoint").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const topic = document.getElementById("topic").value;
    const device = document.getElementById("device").value;

    return {
      endpoint,
      username,
      password,
      topic,
      device,
    };
  }

  async onPositionSuccess(position) {
    const message = Geolocation.from(position);
    return CommonStorage.postGeolocation(message);
  }

  async relay() {
    return setImmediateInterval(async () => {
      try {
        const position = await watchPosition({
          maximumAge: GET_LOCATION_INTERVAL,
          timeout: GET_INTERVAL_TIMEOUT,
          enableHighAccuracy: true,
        });
        const res = await this.onPositionSuccess(position);
        if (res.ok) {
          this.state = "active";
          this.stateData.successes++;

          app.updateConnectButton("Active");
          this.stateData.lastSuccessful = (new Date()).toString();
        } else {
          this.state = "error";
          this.stateData.failures++;

          app.updateConnectButton("Request Failed");
        }

        app.setTheme(app.state);
        app.updateStatus(position);
      } catch (err) {
        this.onPositionError(err);
      }
    }, GET_LOCATION_INTERVAL);
  }

  setTheme(state) {
    document.documentElement.setAttribute("data-theme", state);
    if (state === "active") {
      document.getElementById("connect-button").textContent = "Active";
    }

    if (state !== "inactive") {
      document.getElementById("telemetry-status").style.display = "block";
    }
  }

  updateConnectButton(text) {
    document.getElementById("connect-button").textContent = text;
  }

  updateStatus(position) {
    document.getElementById("last-sent").textContent =
      this.stateData.lastSuccessful;

    const successes = this.stateData.successes;
    const failures = this.stateData.failures;

    document.getElementById("statistics").textContent =
      `${successes} Succeeded, ${failures} Failed`;

    const longitude = position.coords.longitude;
    const latitude = position.coords.latitude;

    document.getElementById("location").href =
      `https://www.google.com/maps?q=${latitude},${longitude}`;
    document.getElementById("location").textContent =
      `${latitude}N, ${longitude}W`;
  }
}

const app = new App();
app.setTheme(app.state);

let pid;

document.querySelector("form").addEventListener("submit", (event) => {
  event.preventDefault();

  app.updateConnectButton("Connecting...");

  if (pid) {
    clearInterval(pid);
  }

  pid = app.relay();
});
