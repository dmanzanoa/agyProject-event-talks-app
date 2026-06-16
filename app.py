import urllib.request
import xml.etree.ElementTree as ET
import ssl
from flask import Flask, jsonify, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        req = urllib.request.Request(url, headers=headers)
        # Bypass SSL verification due to certificate store limits in some environments
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, context=context) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = root.findall('atom:entry', ns)
        if not entries:
            entries = root.findall('entry')
            
        parsed_entries = []
        for entry in entries:
            entry_id = entry.find('atom:id', ns)
            title = entry.find('atom:title', ns)
            updated = entry.find('atom:updated', ns)
            content = entry.find('atom:content', ns)
            
            parsed_entries.append({
                'id': entry_id.text if entry_id is not None else '',
                'date': title.text if title is not None else 'No Date',
                'updated': updated.text if updated is not None else '',
                'content': content.text if content is not None else ''
            })
            
        return jsonify({
            'status': 'success',
            'entries': parsed_entries
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
