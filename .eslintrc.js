module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 2018
    },
    "rules": {
		"no-console": "off",
		"no-empty": "off",
        "indent": [
            "error",
            "tab"
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
			"single",
			{ "avoidEscape": true,
			  "allowTemplateLiterals": true }
        ],
        "semi": [
            "error",
            "always"
        ]
    }
};
