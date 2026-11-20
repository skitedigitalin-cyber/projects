const mongoose = require('mongoose');

const SOURCE_URI = 'mongodb+srv://admin:admin123@cluster0.jnb1iha.mongodb.net/CRM?retryWrites=true&w=majority';
const TARGET_URI = 'mongodb+srv://skitedigitalin_db_user:Sxc9tiVk6ZpH8ljY@skitecrm.y65c2mh.mongodb.net/skitecrm?retryWrites=true&w=majority';

async function compareDatabases() {
    let sourceConn = null;
    let targetConn = null;

    try {
        console.log('Connecting to Source & Target...');
        sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
        targetConn = await mongoose.createConnection(TARGET_URI).asPromise();
        console.log('Connected!');

        const sourceColls = await sourceConn.db.listCollections().toArray();
        const targetColls = await targetConn.db.listCollections().toArray();

        console.log('\n=== SOURCE DB (CRM) COLLECTIONS ===');
        for (const col of sourceColls.sort((a,b) => a.name.localeCompare(b.name))) {
            const count = await sourceConn.db.collection(col.name).countDocuments();
            // Get latest record date if available
            const latestDoc = await sourceConn.db.collection(col.name).find({}).sort({ _id: -1 }).limit(1).toArray();
            let latestInfo = '';
            if (latestDoc && latestDoc[0]) {
                const d = latestDoc[0];
                const dateVal = d.updatedAt || d.createdAt || d.date || d.attendanceDate || d.month || d._id.getTimestamp();
                latestInfo = ` | Latest: ${dateVal}`;
            }
            console.log(`- ${col.name}: ${count} docs${latestInfo}`);
        }

        console.log('\n=== TARGET DB (Skite Prime) COLLECTIONS ===');
        for (const col of targetColls.sort((a,b) => a.name.localeCompare(b.name))) {
            const count = await targetConn.db.collection(col.name).countDocuments();
            console.log(`- ${col.name}: ${count} docs`);
        }

    } catch (err) {
        console.error('Error during inspection:', err);
    } finally {
        if (sourceConn) await sourceConn.close();
        if (targetConn) await targetConn.close();
    }
}

compareDatabases();
