console.log("[Scratch Addon] Loaded");

function injectStuff() {
    function getTextContent(selector) {
        return document.querySelector(selector)?.textContent?.trim() || "";
    }

    async function fetchFollowers(user) {
        try {
            const req = await fetch(`https://scratch.mit.edu/users/${user}/followers/`);
            if (!req.ok) return 0;
            const html = await req.text();

            const match = html.match(/\s*\(([\d,.]+)\)/i);
            if (match) {
                return parseInt(match[1].replace(/[,.]/g, ''), 10);
            }
            return 0;
        } catch (err) {
            console.error("Fehler beim Abrufen der Follower:", err);
            return 0;
        }
    }

    function generateDiv(name, oldcontent) {
        const div = document.createElement('div');
        const header = document.createElement('div');
        const divContent = document.createElement('div');

        const button = document.createElement('button');
        button.textContent = name;
        button.className = "blue-button";

        header.appendChild(button);
        header.className = "box-header"

        if (oldcontent) {
            divContent.appendChild(oldcontent);
            divContent.className = "infobox-content"
        }

        div.appendChild(header);
        div.appendChild(divContent);
        div.className = "info-box"

        return div;
    }

    async function generateWhatIveBeenDoing() {
        const data = await fetch(`https://scratch.mit.edu/messages/ajax/user-activity/?user=${username}&max=15`);

        const div = document.createElement('div');
        div.className = "info-box";
        
        const header = document.createElement('div');
        header.className = "box-header"; 

        const button = document.createElement('button');
        button.textContent = "What I've been doing";
        button.className = "blue-button";

        header.appendChild(button);

        const divContent = document.createElement('div');
        divContent.className = "infobox-content whatIveBeenDoingContent";

        if (data.ok) {
            const results = await data.text();
            divContent.innerHTML = results;

            divContent.querySelectorAll('ul li > div').forEach((rowDiv) => {
                rowDiv.className = "activity-row";
                rowDiv.parentElement.className = "row"
            });

            const heartUrl = chrome.runtime.getURL("assets/heart-small.png");
            const starUrl = chrome.runtime.getURL("assets/star-small.png");
            const projectUrl = chrome.runtime.getURL("assets/project-small.png");
            const followerUrl = chrome.runtime.getURL("assets/person-small.png");
            divContent.querySelectorAll('span.love').forEach((loveIcon) => {
                loveIcon.style.setProperty("background-image", `url("${heartUrl}")`, "important");
            });
            divContent.querySelectorAll('span.favorite').forEach((starIcon) => {
                starIcon.style.setProperty("background-image", `url("${starUrl}")`, "important");
            });
            divContent.querySelectorAll('span.project').forEach((projectIcon) => {
                projectIcon.style.setProperty("background-image", `url("${projectUrl}")`, "important");
            });
            divContent.querySelectorAll('span.follower, span.follow').forEach((followerIcon) => {
                followerIcon.style.setProperty("background-image", `url("${followerUrl}")`, "important");
            });
        }

        div.append(header, divContent);
        return div;
    }

    const username = document.querySelector("#profile-data > div.box-head > div.header-text > h2")?.textContent.trim();
    const body = document.querySelector("#content");
    const existingpfp = document.querySelector("#profile-avatar > div > a > img");

    if (!username || !body || !existingpfp) {
        return false;
    }

    const pfp = document.createElement('img');
    const pfpParts = existingpfp.src.trim().split("_");
    if (pfpParts.length > 1) {
        pfp.src = "//cdn2.scratch.mit.edu/get_" + pfpParts[1] + "_1000x1000.png";
    } else {
        pfp.src = existingpfp.src;
    }
    pfp.className = "pfp";

    const usernameText = document.createElement('p');
    usernameText.textContent = username;
    usernameText.className = "username";

    const userDescText = document.createElement('p');
    const group = getTextContent("#profile-data > div.box-head > div > p > span.group");
    const joined = getTextContent("#profile-data > div.box-head > div > p > span:nth-child(2)");
    userDescText.textContent = `${group} | Joined ${joined} ago`;
    userDescText.className = "user-info";

    const userCountry = document.createElement('p');
    userCountry.textContent = getTextContent("#profile-data > div.box-head > div > p > span.location");
    userCountry.className = "user-info";

    const followerCount = document.createElement('p');
    followerCount.className = "user-info";
    followerCount.textContent = "Loading followers...";
    
    fetchFollowers(username).then((result) => {
        followerCount.textContent = `${result} followers`;
    });

    const featuredProjectLink = document.createElement('a');
    const featuredProject = document.querySelector("#featured-project > img");
    const projectLinkElem = document.querySelector('a.project-name');

    if (featuredProject) {
        const featuredProjectThumb = document.createElement('img');
        featuredProjectThumb.src = featuredProject.src;
        featuredProjectThumb.className = "featured-project-thumbnail";
        featuredProjectLink.appendChild(featuredProjectThumb);

    }
    if (projectLinkElem) {
        featuredProjectLink.href = projectLinkElem.href.trim();
    }
    
    const userInfo = document.createElement('div');
    userInfo.append(usernameText, userDescText, userCountry, followerCount);
    
    const leftSide = document.createElement('div');
    leftSide.className = "top-box-left";
    leftSide.append(pfp, userInfo);
    
    const rightSide = document.createElement('div');
    rightSide.className = "top-box-right";
    rightSide.append(featuredProjectLink);
    
    const topBox = document.createElement('div');
    topBox.className = 'top-box';
    topBox.append(leftSide, rightSide);
    
    const top_box_bg = document.createElement('div');
    top_box_bg.className = "top-box-bg";
    if (featuredProject?.src) {
        top_box_bg.style.backgroundImage = `url('${featuredProject.src}')`;
    }

    const topBoxFinal = document.createElement('div');
    topBoxFinal.className = "top-box-final";
    topBoxFinal.append(topBox, top_box_bg);

    const boxes = document.createElement('div');
    boxes.className = "boxes"

    const aboutMeContent = document.querySelector("#bio-readonly > div > p");
    if (aboutMeContent) {
        const aboutMe = generateDiv("About me", aboutMeContent);
        boxes.appendChild(aboutMe);
    } else {
        console.log("About me content not found")
    }

    const whatImWorkingOnContent = document.querySelector("#status-readonly > div > p");
    if (whatImWorkingOnContent) {
        const whatImWorkingOn = generateDiv("What I'm working on", whatImWorkingOnContent);
        boxes.appendChild(whatImWorkingOn);
    }

    const whatIveBeenDoing = generateWhatIveBeenDoing().then((result) => {
        boxes.appendChild(result)
    })

    const topboxAndBoxesTogether = document.createElement('div');
    topboxAndBoxesTogether.append(topBoxFinal, boxes);

    document.getElementById('profile-data').replaceWith(topboxAndBoxesTogether)

    return true;
}

const observer = new MutationObserver(() => {
    if (injectStuff()) {
        observer.disconnect();
    }
});

observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
});